package com.vanerp.einvoice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vanerp.dto.EInvoiceSettingsDto;
import com.vanerp.dto.EInvoiceSubmissionDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.CompanySettingsRepository;
import com.vanerp.repository.EInvoiceSubmissionRepository;
import com.vanerp.service.CompanySettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * الربط الاختياري مع نظام الفوترة الوطني الأردني (JoFotara).
 * <ul>
 *   <li>عند إنشاء فاتورة بيع / مرتجع / إلغاء فاتورة مُرسلة يُنشأ مستند "بانتظار الإرسال" برقم UUID وعدّاد ICV.</li>
 *   <li>يُبنى XML لحظة الإرسال، ويُرسل مشفّراً Base64 داخل JSON مع Client-Id و Secret-Key.</li>
 *   <li>أي خطأ بالفوترة لا يوقف البيع: يبقى المستند "فشل" ويُعاد تلقائياً (أخطاء الاتصال) أو يدوياً بعد تصحيح البيانات.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EInvoiceService {

    private static final Set<BigDecimal> ALLOWED_RATES = Set.of(0, 1, 2, 3, 4, 5, 7, 8, 10, 16).stream()
            .map(BigDecimal::valueOf).map(BigDecimal::stripTrailingZeros).collect(java.util.stream.Collectors.toSet());
    private static final BigDecimal NAME_REQUIRED_ABOVE = BigDecimal.valueOf(10_000);

    private final EInvoiceSubmissionRepository repo;
    private final CompanySettingsService companySettingsService;
    private final CompanySettingsRepository companySettingsRepository;
    private final PlatformTransactionManager transactionManager;
    private final ObjectMapper objectMapper;

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "einvoice-sender");
        t.setDaemon(true);
        return t;
    });
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private final Set<Long> inFlight = ConcurrentHashMap.newKeySet();

    // ======================= أحداث الفواتير (داخل معاملة الفاتورة) =======================

    public void onInvoiceCreated(SalesInvoice invoice) {
        CompanySettings s = companySettingsService.getOrCreate();
        if (!s.isEinvEnabled()) return;
        boolean cash = invoice.getPaidAmount().compareTo(invoice.getGrandTotal()) >= 0;
        EInvoiceSubmission sub = repo.save(newSubmission(EInvoiceSubmission.INVOICE, invoice, null, invoice.getInvoiceNumber(), cash, null));
        scheduleAutoSend(s, sub.getId());
    }

    public void onReturnCreated(SalesInvoice invoice, SalesReturn salesReturn, String reason) {
        CompanySettings s = companySettingsService.getOrCreate();
        Optional<EInvoiceSubmission> original = repo.findFirstBySalesInvoiceIdAndDocType(invoice.getId(), EInvoiceSubmission.INVOICE);
        // فاتورة أُنشئت قبل تفعيل الربط (أو أُلغي مستندها قبل إرساله) لا يوجد لها أصل بنظام الفوترة
        if (original.isEmpty() || EInvoiceSubmission.CANCELLED.equals(original.get().getStatus())) return;
        String why = reason != null && !reason.isBlank() ? reason : "إرجاع بضاعة";
        EInvoiceSubmission sub = repo.save(newSubmission(EInvoiceSubmission.RETURN, invoice, salesReturn,
                salesReturn.getReturnNumber(), original.get().isCash(), why));
        scheduleAutoSend(s, sub.getId());
    }

    /** إلغاء فاتورة: إن كانت مُرسلة تُرسل فاتورة إرجاع كاملة، وإلا يُلغى مستندها قبل أن يُرسل. */
    public void onInvoiceCancelled(SalesInvoice invoice) {
        Optional<EInvoiceSubmission> original = repo.findFirstBySalesInvoiceIdAndDocType(invoice.getId(), EInvoiceSubmission.INVOICE);
        if (original.isEmpty()) return;
        if (EInvoiceSubmission.SENT.equals(original.get().getStatus())) {
            boolean hasRemaining = invoice.getItems().stream()
                    .anyMatch(it -> it.getQuantity().subtract(it.getReturnedQuantity()).signum() > 0);
            if (!hasRemaining) return;
            EInvoiceSubmission sub = repo.save(newSubmission(EInvoiceSubmission.CANCEL_RETURN, invoice, null,
                    invoice.getInvoiceNumber() + "-C", original.get().isCash(), "إلغاء الفاتورة"));
            scheduleAutoSend(companySettingsService.getOrCreate(), sub.getId());
        } else {
            for (EInvoiceSubmission sub : repo.findBySalesInvoiceIdOrderByIdAsc(invoice.getId())) {
                if (!EInvoiceSubmission.SENT.equals(sub.getStatus())) {
                    sub.setStatus(EInvoiceSubmission.CANCELLED);
                    sub.setLastError("أُلغيت الفاتورة قبل إرسالها لنظام الفوترة");
                    repo.save(sub);
                }
            }
        }
    }

    /** الفاتورة المرسلة لنظام الفوترة لا تُعدَّل - التصحيح يكون بالإرجاع أو الإلغاء. */
    public void assertEditable(SalesInvoice invoice) {
        repo.findFirstBySalesInvoiceIdAndDocType(invoice.getId(), EInvoiceSubmission.INVOICE)
                .filter(sub -> EInvoiceSubmission.SENT.equals(sub.getStatus()))
                .ifPresent(sub -> {
                    throw ApiException.badRequest("الفاتورة مُرسلة لنظام الفوترة الوطني ولا يمكن تعديلها - استخدم الإرجاع أو الإلغاء");
                });
    }

    private EInvoiceSubmission newSubmission(String type, SalesInvoice invoice, SalesReturn salesReturn,
                                             String number, boolean cash, String reason) {
        return EInvoiceSubmission.builder()
                .docType(type).salesInvoice(invoice).salesReturn(salesReturn)
                .docNumber(number).uuid(UUID.randomUUID().toString()).icv(repo.nextIcv())
                .cash(cash).reason(reason).build();
    }

    private void scheduleAutoSend(CompanySettings s, Long submissionId) {
        if (!s.isEinvEnabled() || !"AUTO".equals(s.getEinvSendMode())) return;
        Runnable job = () -> executor.submit(() -> sendQuietly(submissionId));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    job.run();
                }
            });
        } else {
            job.run();
        }
    }

    // ======================= الإرسال =======================

    /** إعادة المحاولة التلقائية للمستندات المعلّقة أو الفاشلة بخطأ اتصال. */
    @Scheduled(fixedDelayString = "${app.einvoice.retry-ms:120000}", initialDelay = 60000)
    public void retryDue() {
        CompanySettings s = companySettingsService.getOrCreate();
        if (!s.isEinvEnabled() || !"AUTO".equals(s.getEinvSendMode())) return;
        List<EInvoiceSubmission> due = new TransactionTemplate(transactionManager).execute(st ->
                repo.findDueForSending(LocalDateTime.now().minusMinutes(2), PageRequest.of(0, 50)));
        if (due == null) return;
        for (EInvoiceSubmission sub : due) sendQuietly(sub.getId());
    }

    private void sendQuietly(Long id) {
        try {
            send(id);
        } catch (Exception e) {
            log.warn("E-invoice {} send error: {}", id, e.getMessage());
        }
    }

    private record Prepared(String xml, String url, String clientId, String secret) {}

    /** إرسال مستند واحد (يدوياً أو تلقائياً) وإرجاع حالته بعد الإرسال. */
    public EInvoiceSubmissionDto send(Long id) {
        if (!inFlight.add(id)) return loadDto(id);
        try {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            Prepared prepared = tx.execute(st -> prepare(id));
            if (prepared != null) {
                Outcome outcome = post(prepared);
                tx.executeWithoutResult(st -> applyOutcome(id, outcome));
            }
            return loadDto(id);
        } finally {
            inFlight.remove(id);
        }
    }

    /** يبني الـ XML ويتحقق من البيانات. يرجع null إن لم يكن المستند جاهزاً للإرسال (مع حفظ السبب). */
    private Prepared prepare(Long id) {
        EInvoiceSubmission sub = repo.findById(id).orElseThrow(() -> ApiException.notFound("مستند الفوترة غير موجود"));
        if (EInvoiceSubmission.SENT.equals(sub.getStatus()) || EInvoiceSubmission.CANCELLED.equals(sub.getStatus())) return null;
        CompanySettings s = companySettingsService.getOrCreate();
        sub.setLastAttemptAt(LocalDateTime.now());
        try {
            if (!sub.getDocType().equals(EInvoiceSubmission.INVOICE)) {
                EInvoiceSubmission original = repo.findFirstBySalesInvoiceIdAndDocType(sub.getSalesInvoice().getId(), EInvoiceSubmission.INVOICE)
                        .orElseThrow(() -> new ValidationException("لا توجد فاتورة أصلية مُرسلة لهذا الإرجاع"));
                if (!EInvoiceSubmission.SENT.equals(original.getStatus())) {
                    // ينتظر إرسال الفاتورة الأصلية أولاً (سيُعاد تلقائياً)
                    sub.setStatus(EInvoiceSubmission.PENDING);
                    sub.setLastError("بانتظار قبول الفاتورة الأصلية بنظام الفوترة");
                    repo.save(sub);
                    return null;
                }
            }
            String xml = EInvoiceXmlBuilder.build(buildDoc(sub, s));
            sub.setXml(xml);
            sub.setAttempts(sub.getAttempts() + 1);
            repo.save(sub);
            return new Prepared(xml, s.getEinvApiUrl(), s.getEinvClientId(), s.getEinvSecretKey());
        } catch (ValidationException e) {
            sub.setStatus(EInvoiceSubmission.FAILED);
            sub.setRetryable(false);
            sub.setLastError(e.getMessage());
            repo.save(sub);
            return null;
        }
    }

    private record Outcome(boolean success, boolean retryable, String error, String qr, String body) {}

    private Outcome post(Prepared p) {
        try {
            String b64 = Base64.getEncoder().encodeToString(p.xml().getBytes(StandardCharsets.UTF_8));
            String body = objectMapper.writeValueAsString(Map.of("invoice", b64));
            HttpRequest req = HttpRequest.newBuilder(URI.create(p.url()))
                    .timeout(Duration.ofSeconds(45))
                    .header("Client-Id", p.clientId())
                    .header("Secret-Key", p.secret())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return interpret(res.statusCode(), res.body());
        } catch (java.io.IOException e) {
            String why = e instanceof java.net.http.HttpTimeoutException ? "انتهت مهلة الاتصال"
                    : e instanceof java.net.ConnectException ? "لا يوجد اتصال بالخادم"
                    : e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return new Outcome(false, true, "تعذّر الاتصال بنظام الفوترة (" + why + ") - سيُعاد الإرسال تلقائياً", null, null);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Outcome(false, true, "انقطع الإرسال", null, null);
        } catch (Exception e) {
            return new Outcome(false, false, "خطأ بالإرسال: " + e.getMessage(), null, null);
        }
    }

    /** قراءة رد نظام الفوترة: النجاح يحمل رمز QR يجب طباعته على الفاتورة. */
    private Outcome interpret(int code, String body) {
        String trimmed = body != null && body.length() > 20000 ? body.substring(0, 20000) : body;
        JsonNode root = null;
        try {
            root = body != null && !body.isBlank() ? objectMapper.readTree(body) : null;
        } catch (Exception ignored) {
            // رد غير JSON
        }
        if (code == 401 || code == 403) {
            return new Outcome(false, false, "رفض نظام الفوترة الدخول - تحقق من رقم المستخدم (Client ID) والمفتاح السري ("
                    + extractErrors(root, code, body) + ")", null, trimmed);
        }
        if (code >= 500 || code == 429) {
            return new Outcome(false, true, "نظام الفوترة غير متاح حالياً (" + code + ") - سيُعاد الإرسال تلقائياً", null, trimmed);
        }
        String status = root != null ? root.path("EINV_STATUS").asText("") : "";
        String qr = root != null ? root.path("EINV_QR").asText("") : "";
        boolean accepted = code >= 200 && code < 300
                && ("SUBMITTED".equalsIgnoreCase(status) || "ALREADY_SUBMITTED".equalsIgnoreCase(status)
                    || (!qr.isBlank() && !status.toUpperCase().contains("NOT")));
        if (accepted) return new Outcome(true, false, null, qr.isBlank() ? null : qr, trimmed);
        return new Outcome(false, false, extractErrors(root, code, body), null, trimmed);
    }

    private String extractErrors(JsonNode root, int code, String body) {
        List<String> messages = new ArrayList<>();
        if (root != null) {
            for (JsonNode err : root.path("EINV_RESULTS").path("ERRORS")) {
                String m = err.path("EINV_MESSAGE").asText(err.toString());
                String c = err.path("EINV_CODE").asText("");
                messages.add(c.isBlank() ? m : c + ": " + m);
            }
        }
        if (messages.isEmpty()) {
            String raw = body == null ? "" : body.length() > 400 ? body.substring(0, 400) + "..." : body;
            messages.add("رفض نظام الفوترة المستند (" + code + ") " + raw);
        }
        return String.join(" | ", messages);
    }

    private void applyOutcome(Long id, Outcome o) {
        EInvoiceSubmission sub = repo.findById(id).orElseThrow();
        sub.setResponse(o.body());
        if (o.success()) {
            sub.setStatus(EInvoiceSubmission.SENT);
            sub.setSentAt(LocalDateTime.now());
            sub.setQrCode(o.qr());
            sub.setLastError(null);
        } else {
            sub.setStatus(EInvoiceSubmission.FAILED);
            sub.setRetryable(o.retryable());
            sub.setLastError(o.error());
        }
        repo.save(sub);
    }

    // ======================= بناء المستند =======================

    static class ValidationException extends RuntimeException {
        ValidationException(String m) {
            super(m);
        }
    }

    private EInvoiceXmlBuilder.Doc buildDoc(EInvoiceSubmission sub, CompanySettings s) {
        requireSetting(s.getTaxNumber(), "الرقم الضريبي للبائع");
        requireSetting(s.getEinvIncomeSourceSeq(), "تسلسل مصدر الدخل");
        requireSetting(s.getEinvClientId(), "رقم المستخدم (Client ID)");
        requireSetting(s.getEinvSecretKey(), "المفتاح السري (Secret Key)");
        String sellerName = s.getEinvRegistrationName() != null && !s.getEinvRegistrationName().isBlank()
                ? s.getEinvRegistrationName() : s.getName();

        boolean withTax = !"INCOME".equals(s.getEinvTaxpayerType());
        String typeCode = (sub.isCash() ? "01" : "02") + (withTax ? "2" : "1");
        SalesInvoice inv = sub.getSalesInvoice();

        List<EInvoiceXmlBuilder.Line> lines = new ArrayList<>();
        switch (sub.getDocType()) {
            case EInvoiceSubmission.INVOICE -> {
                for (SalesInvoiceItem it : inv.getItems()) {
                    BigDecimal gross = it.getQuantity().multiply(it.getUnitPrice()).setScale(3, RoundingMode.HALF_UP);
                    BigDecimal tax = it.getLineTotal().subtract(gross.subtract(nz(it.getDiscount())));
                    lines.add(line(it, it.getQuantity(), nz(it.getDiscount()), tax, withTax));
                }
            }
            case EInvoiceSubmission.RETURN -> {
                SalesReturn ret = sub.getSalesReturn();
                for (SalesReturnItem ri : ret.getItems()) {
                    lines.add(proportionalLine(ri.getSalesInvoiceItem(), ri.getQuantity(), withTax));
                }
            }
            default -> {
                for (SalesInvoiceItem it : inv.getItems()) {
                    BigDecimal remaining = it.getQuantity().subtract(it.getReturnedQuantity());
                    if (remaining.signum() > 0) lines.add(proportionalLine(it, remaining, withTax));
                }
            }
        }
        if (lines.isEmpty()) throw new ValidationException("المستند لا يحتوي على أي سطر");

        boolean isReturn = !EInvoiceSubmission.INVOICE.equals(sub.getDocType());
        EInvoiceXmlBuilder.Buyer buyer = null;
        Customer c = inv.getCustomer();
        if (c != null) {
            if (c.getIdNumber() != null && !c.getIdNumber().isBlank() && !c.getIdNumber().matches("\\d+")) {
                throw new ValidationException("رقم هوية العميل \"" + c.getName() + "\" يجب أن يكون أرقاماً فقط");
            }
            buyer = new EInvoiceXmlBuilder.Buyer(c.getIdType(), c.getIdNumber(), c.getPostalCode(), c.getCityCode(), c.getName(), c.getPhone());
        }

        String originalId = null, originalUuid = null;
        BigDecimal originalTotal = null;
        if (isReturn) {
            EInvoiceSubmission original = repo.findFirstBySalesInvoiceIdAndDocType(inv.getId(), EInvoiceSubmission.INVOICE).orElseThrow();
            originalId = original.getDocNumber();
            originalUuid = original.getUuid();
            originalTotal = inv.getGrandTotal();
        }

        LocalDateTime issued = switch (sub.getDocType()) {
            case EInvoiceSubmission.INVOICE -> inv.getCreatedAt();
            case EInvoiceSubmission.RETURN -> sub.getSalesReturn().getCreatedAt();
            default -> sub.getCreatedAt();
        };

        EInvoiceXmlBuilder.Doc doc = new EInvoiceXmlBuilder.Doc(isReturn, withTax, typeCode,
                sub.getDocNumber(), sub.getUuid(), issued.toLocalDate(),
                isReturn ? sub.getReason() : inv.getNotes(), sub.getIcv(),
                originalId, originalUuid, originalTotal, sub.getReason(),
                s.getTaxNumber(), sellerName, s.getEinvIncomeSourceSeq(), buyer, lines);

        // حسب الدليل: اسم المشتري إجباري لفواتير الذمم أو النقدية التي تتجاوز 10,000 دينار
        if (!isReturn && (!sub.isCash() || EInvoiceXmlBuilder.totals(doc).taxInclusive().compareTo(NAME_REQUIRED_ABOVE) > 0)
                && (c == null || c.getName() == null || c.getName().isBlank())) {
            throw new ValidationException("اسم المشتري إجباري لفواتير الذمم أو النقدية فوق 10,000 دينار - اختر عميلاً للفاتورة");
        }
        return doc;
    }

    /** سطر إرجاع: الخصم والضريبة بنفس نسبة الكمية المرتجعة من السطر الأصلي. */
    private EInvoiceXmlBuilder.Line proportionalLine(SalesInvoiceItem it, BigDecimal qty, boolean withTax) {
        BigDecimal discount = nz(it.getDiscount()).multiply(qty).divide(it.getQuantity(), 3, RoundingMode.HALF_UP);
        BigDecimal base = qty.multiply(it.getUnitPrice()).setScale(3, RoundingMode.HALF_UP).subtract(discount);
        BigDecimal tax = base.multiply(nz(it.getTaxRate())).divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
        return line(it, qty, discount, tax, withTax);
    }

    private EInvoiceXmlBuilder.Line line(SalesInvoiceItem it, BigDecimal qty, BigDecimal discount, BigDecimal tax, boolean withTax) {
        Product p = it.getProduct();
        BigDecimal rate = nz(it.getTaxRate());
        if (withTax && !ALLOWED_RATES.contains(rate.stripTrailingZeros())) {
            throw new ValidationException("نسبة ضريبة الصنف \"" + p.getName() + "\" (" + rate.stripTrailingZeros().toPlainString()
                    + "%) غير مقبولة بنظام الفوترة - المسموح: 0، 1، 2، 3، 4، 5، 7، 8، 10، 16");
        }
        String category = rate.signum() > 0 ? "S" : ("O".equals(p.getZeroTaxType()) ? "O" : "Z");
        return new EInvoiceXmlBuilder.Line(p.getName(), qty, it.getUnitPrice(), discount,
                withTax ? tax : BigDecimal.ZERO, rate, category);
    }

    private static void requireSetting(String v, String label) {
        if (v == null || v.isBlank()) throw new ValidationException("أكمل إعدادات الفوترة الوطنية: " + label);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    // ======================= العرض والإعدادات =======================

    /** قراءة داخل معاملة صريحة (الاستدعاء من داخل نفس الكلاس لا يمر عبر @Transactional). */
    private EInvoiceSubmissionDto loadDto(Long id) {
        return new TransactionTemplate(transactionManager).execute(st -> toDto(repo.findById(id).orElseThrow()));
    }

    @Transactional(readOnly = true)
    public EInvoiceSubmissionDto get(Long id) {
        return toDto(repo.findById(id).orElseThrow(() -> ApiException.notFound("مستند الفوترة غير موجود")));
    }

    @Transactional(readOnly = true)
    public List<EInvoiceSubmissionDto> forInvoice(Long invoiceId) {
        return repo.findBySalesInvoiceIdOrderByIdAsc(invoiceId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<EInvoiceSubmissionDto> search(String status, Pageable pageable) {
        return repo.search(status == null || status.isBlank() ? null : status, pageable).map(this::toDto);
    }

    /** حالة الفوترة لكل فاتورة (حالة مستند الفاتورة نفسها + هل يوجد مرتجع فاشل) - لعمود بقائمة المبيعات. */
    @Transactional(readOnly = true)
    public Map<Long, String> statuses(List<Long> invoiceIds) {
        Map<Long, String> out = new HashMap<>();
        if (invoiceIds == null || invoiceIds.isEmpty()) return out;
        for (EInvoiceSubmission s : repo.findBySalesInvoiceIdIn(invoiceIds)) {
            Long key = s.getSalesInvoice().getId();
            if (EInvoiceSubmission.INVOICE.equals(s.getDocType())) {
                out.merge(key, s.getStatus(), (a, b) -> "FAILED".equals(a) ? a : b);
            } else if (EInvoiceSubmission.FAILED.equals(s.getStatus())) {
                out.put(key, EInvoiceSubmission.FAILED);
            }
        }
        return out;
    }

    /** معاينة XML (يُبنى من البيانات الحالية بدون إرسال) - يرمي رسالة واضحة إن كانت البيانات ناقصة. */
    @Transactional(readOnly = true)
    public String previewXml(Long id) {
        EInvoiceSubmission sub = repo.findById(id).orElseThrow(() -> ApiException.notFound("مستند الفوترة غير موجود"));
        if (sub.getXml() != null && EInvoiceSubmission.SENT.equals(sub.getStatus())) return sub.getXml();
        try {
            return EInvoiceXmlBuilder.build(buildDoc(sub, companySettingsService.getOrCreate()));
        } catch (ValidationException e) {
            throw ApiException.badRequest(e.getMessage());
        }
    }

    /** إرسال فاتورة يدوياً: ينشئ مستندها إن لم يوجد (فاتورة قبل التفعيل مثلاً) ثم يرسله. */
    public EInvoiceSubmissionDto sendInvoice(Long invoiceId, com.vanerp.repository.SalesInvoiceRepository invoices) {
        Long subId = new TransactionTemplate(transactionManager).execute(st -> {
            CompanySettings s = companySettingsService.getOrCreate();
            if (!s.isEinvEnabled()) throw ApiException.badRequest("الربط مع نظام الفوترة الوطني غير مفعّل");
            Optional<EInvoiceSubmission> existing = repo.findFirstBySalesInvoiceIdAndDocType(invoiceId, EInvoiceSubmission.INVOICE);
            if (existing.isPresent()) {
                if (EInvoiceSubmission.CANCELLED.equals(existing.get().getStatus())) {
                    throw ApiException.badRequest("الفاتورة ملغاة ولم تُرسل لنظام الفوترة");
                }
                return existing.get().getId();
            }
            SalesInvoice inv = invoices.findById(invoiceId).orElseThrow(() -> ApiException.notFound("الفاتورة غير موجودة"));
            if (inv.getStatus() == InvoiceStatus.CANCELLED) throw ApiException.badRequest("لا يمكن إرسال فاتورة ملغاة");
            boolean cash = inv.getPaidAmount().compareTo(inv.getGrandTotal()) >= 0;
            return repo.save(newSubmission(EInvoiceSubmission.INVOICE, inv, null, inv.getInvoiceNumber(), cash, null)).getId();
        });
        return send(subId);
    }

    /** يعيد فتح مستند فشل بخطأ بيانات بعد تصحيحها ليُرسل من جديد. */
    public EInvoiceSubmissionDto resend(Long id) {
        new TransactionTemplate(transactionManager).executeWithoutResult(st -> {
            EInvoiceSubmission sub = repo.findById(id).orElseThrow(() -> ApiException.notFound("مستند الفوترة غير موجود"));
            if (EInvoiceSubmission.CANCELLED.equals(sub.getStatus())) throw ApiException.badRequest("المستند ملغى");
            if (!companySettingsService.getOrCreate().isEinvEnabled()) {
                throw ApiException.badRequest("الربط مع نظام الفوترة الوطني غير مفعّل");
            }
            sub.setRetryable(true);
            repo.save(sub);
        });
        return send(id);
    }

    @Transactional(readOnly = true)
    public Optional<String> qrForInvoice(Long invoiceId) {
        return repo.findFirstBySalesInvoiceIdAndDocType(invoiceId, EInvoiceSubmission.INVOICE)
                .filter(s -> EInvoiceSubmission.SENT.equals(s.getStatus()))
                .map(EInvoiceSubmission::getQrCode)
                .filter(q -> q != null && !q.isBlank());
    }

    @Transactional(readOnly = true)
    public EInvoiceSettingsDto getSettings() {
        CompanySettings s = companySettingsService.getOrCreate();
        return new EInvoiceSettingsDto(s.isEinvEnabled(), s.getEinvTaxpayerType(), s.getEinvSendMode(), s.getTaxNumber(),
                s.getEinvRegistrationName(), s.getEinvIncomeSourceSeq(), s.getEinvClientId(), s.getEinvSecretKey(),
                s.getEinvSecretKey() != null && !s.getEinvSecretKey().isBlank(), s.getEinvApiUrl(),
                repo.countByStatus(EInvoiceSubmission.PENDING), repo.countByStatus(EInvoiceSubmission.FAILED),
                repo.countByStatus(EInvoiceSubmission.SENT));
    }

    @Transactional
    public EInvoiceSettingsDto updateSettings(EInvoiceSettingsDto r) {
        CompanySettings s = companySettingsService.getOrCreate();
        String type = "INCOME".equals(r.taxpayerType()) ? "INCOME" : "GENERAL_SALES";
        String mode = "MANUAL".equals(r.sendMode()) ? "MANUAL" : "AUTO";
        s.setEinvTaxpayerType(type);
        s.setEinvSendMode(mode);
        s.setTaxNumber(trim(r.sellerTaxNumber()));
        s.setEinvRegistrationName(trim(r.registrationName()));
        s.setEinvIncomeSourceSeq(trim(r.incomeSourceSeq()));
        s.setEinvClientId(trim(r.clientId()));
        s.setEinvSecretKey(trim(r.secretKey()));
        if (r.apiUrl() != null && !r.apiUrl().isBlank()) {
            String url = r.apiUrl().trim();
            if (!url.startsWith("https://")) throw ApiException.badRequest("رابط نظام الفوترة يجب أن يبدأ بـ https://");
            s.setEinvApiUrl(url);
        }
        if (r.enabled()) {
            List<String> missing = new ArrayList<>();
            if (blank(s.getTaxNumber())) missing.add("الرقم الضريبي");
            if (blank(s.getEinvIncomeSourceSeq())) missing.add("تسلسل مصدر الدخل");
            if (blank(s.getEinvClientId())) missing.add("رقم المستخدم (Client ID)");
            if (blank(s.getEinvSecretKey())) missing.add("المفتاح السري (Secret Key)");
            if (!missing.isEmpty()) throw ApiException.badRequest("لتفعيل الربط أكمل: " + String.join("، ", missing));
        }
        s.setEinvEnabled(r.enabled());
        s.setUpdatedAt(LocalDateTime.now());
        companySettingsRepository.save(s);
        return getSettings();
    }

    private static String trim(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static boolean blank(String v) {
        return v == null || v.isBlank();
    }

    private EInvoiceSubmissionDto toDto(EInvoiceSubmission s) {
        SalesInvoice inv = s.getSalesInvoice();
        return new EInvoiceSubmissionDto(s.getId(), s.getDocType(), inv.getId(), inv.getInvoiceNumber(), s.getDocNumber(),
                inv.getCustomer() != null ? inv.getCustomer().getName() : null, inv.getGrandTotal(),
                s.getUuid(), s.getIcv(), s.isCash(), s.getStatus(), s.isRetryable(), s.getAttempts(), s.getLastError(),
                s.getQrCode() != null && !s.getQrCode().isBlank(), s.getReason(), s.getLastAttemptAt(), s.getSentAt(), s.getCreatedAt());
    }
}
