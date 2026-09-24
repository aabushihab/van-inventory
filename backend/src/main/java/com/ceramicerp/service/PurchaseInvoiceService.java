package com.ceramicerp.service;

import com.ceramicerp.dto.InvoiceItemDto;
import com.ceramicerp.dto.InvoiceItemRequest;
import com.ceramicerp.dto.PartyBalanceDto;
import com.ceramicerp.dto.PaymentDto;
import com.ceramicerp.dto.PurchaseInvoiceCreateRequest;
import com.ceramicerp.dto.PurchaseInvoiceDto;
import com.ceramicerp.dto.PurchasePaymentRequest;
import com.ceramicerp.dto.PurchaseRefundRequest;
import com.ceramicerp.dto.PurchaseReturnDto;
import com.ceramicerp.dto.PurchaseReturnItemDto;
import com.ceramicerp.dto.PurchaseReturnItemRequest;
import com.ceramicerp.dto.PurchaseReturnRequest;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.*;
import com.ceramicerp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PurchaseInvoiceService {

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final PurchaseInvoicePaymentRepository purchaseInvoicePaymentRepository;
    private final PurchaseReturnRepository purchaseReturnRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final AccountService accountService;
    private final FiscalYearClosingService fiscalYearClosingService;

    /** يمنع إلغاء/إرجاع فاتورة تاريخها ضمن فترة مالية مقفلة - نفس حارس AccountService.recordTransaction. */
    private void guardNotClosed(PurchaseInvoice invoice) {
        fiscalYearClosingService.latestClosingDate()
                .filter(closed -> !invoice.getCreatedAt().toLocalDate().isAfter(closed))
                .ifPresent(closed -> {
                    throw ApiException.badRequest("لا يمكن تعديل فاتورة بتاريخ ضمن فترة مالية مقفلة (حتى " + closed + ")");
                });
    }

    @Transactional(readOnly = true)
    public Page<PurchaseInvoiceDto> findAll(Pageable pageable) {
        return purchaseInvoiceRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseInvoiceDto> search(Long supplierId, InvoiceStatus status, LocalDate from, LocalDate to, String q, Pageable pageable) {
        // نتجنب تمرير NULL لمعاملات التاريخ لأن PostgreSQL/PgJDBC لا يستطيع استنتاج نوعها في حالة NULL
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime toDateTime = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusYears(50);
        return purchaseInvoiceRepository.search(supplierId, status, fromDateTime, toDateTime, q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public PurchaseInvoiceDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public PurchaseInvoiceDto create(PurchaseInvoiceCreateRequest request, User actingUser) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Supplier supplier = request.supplierId() != null
                ? supplierRepository.findById(request.supplierId()).orElseThrow(() -> ApiException.notFound("المورد غير موجود"))
                : null;

        PurchaseInvoice invoice = PurchaseInvoice.builder()
                .invoiceNumber(generateInvoiceNumber())
                .supplier(supplier).warehouse(warehouse).branch(branch)
                .status(InvoiceStatus.CONFIRMED)
                .paidAmount(request.paidAmount() != null ? request.paidAmount() : BigDecimal.ZERO)
                .notes(request.notes())
                .dueDate(request.dueDate())
                .createdBy(actingUser)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO, taxTotal = BigDecimal.ZERO, discountTotal = BigDecimal.ZERO;

        for (InvoiceItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> ApiException.notFound("منتج غير موجود ضمن عناصر الفاتورة"));
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, warehouse);

            BigDecimal tax = itemReq.taxRate() != null ? itemReq.taxRate() : product.getTaxRate();
            BigDecimal discount = itemReq.discount() != null ? itemReq.discount() : BigDecimal.ZERO;
            // كل حد يُقرَّب لثلاث خانات عشرية (مطابقة لدقة عمود قاعدة البيانات) قبل التجميع، بحيث يبقى
            // إجمالي الفاتورة مطابقاً تماماً لمجموع أسطرها المعروضة دائماً، بدل تراكم فروق تقريب طفيفة.
            BigDecimal grossLine = itemReq.quantity().multiply(itemReq.unitPrice()).setScale(3, RoundingMode.HALF_UP);
            BigDecimal lineBase = grossLine.subtract(discount);
            BigDecimal lineTax = lineBase.multiply(tax).divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineBase.add(lineTax);

            PurchaseInvoiceItem item = PurchaseInvoiceItem.builder()
                    .purchaseInvoice(invoice).product(product).warehouse(itemWarehouse)
                    .quantity(itemReq.quantity()).unitPrice(itemReq.unitPrice())
                    .taxRate(tax).discount(discount).lineTotal(lineTotal)
                    .build();
            invoice.getItems().add(item);

            subtotal = subtotal.add(grossLine);
            taxTotal = taxTotal.add(lineTax);
            discountTotal = discountTotal.add(discount);

            // يُحدَّث متوسط تكلفة الشراء تلقائياً قبل تطبيق حركة المخزون (يحتاج الكمية القديمة قبل إضافة الجديدة)
            stockService.updateWeightedAverageCost(product, itemReq.quantity(), itemReq.unitPrice());

            // فاتورة الشراء تزيد المخزون
            stockService.applyMovement(product, itemWarehouse, itemReq.quantity(), MovementType.PURCHASE_IN,
                    "PURCHASE_INVOICE", null, "فاتورة شراء", actingUser);
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setDiscountTotal(discountTotal);
        BigDecimal grandTotal = subtotal.subtract(discountTotal).add(taxTotal);
        invoice.setGrandTotal(grandTotal);

        if (invoice.getPaidAmount() != null && invoice.getPaidAmount().compareTo(grandTotal) > 0) {
            throw ApiException.badRequest("لا يمكن دفع مبلغ أكبر من إجمالي الفاتورة ("
                    + grandTotal.stripTrailingZeros().toPlainString() + ")");
        }

        if (invoice.getPaidAmount().signum() > 0 && request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل دفعة");
        }

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        if (saved.getPaidAmount().signum() > 0) {
            Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
            PurchaseInvoicePayment payment = purchaseInvoicePaymentRepository.save(PurchaseInvoicePayment.builder()
                    .purchaseInvoice(saved).amount(saved.getPaidAmount()).account(account)
                    .note("دفعة أولى عند إصدار الفاتورة").createdBy(actingUser).build());
            if (account != null) {
                accountService.recordTransaction(request.accountId(), TxDirection.OUT, saved.getPaidAmount(),
                        LocalDate.now(), AccountSourceType.PURCHASE_PAYMENT, payment.getId(),
                        "دفعة أولى - فاتورة شراء رقم " + saved.getInvoiceNumber(), actingUser);
            }
        }
        return toDto(saved);
    }

    /**
     * إضافة دفعة جديدة على فاتورة شراء (تقسيط): لا يمكن أن يتجاوز مجموع الدفعات إجمالي الفاتورة.
     */
    @Transactional
    public PurchaseInvoiceDto addPayment(Long invoiceId, PurchasePaymentRequest request, User actingUser) {
        PurchaseInvoice invoice = getOrThrow(invoiceId);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw ApiException.badRequest("لا يمكن إضافة دفعة لفاتورة ملغاة");
        }
        BigDecimal remaining = netDueAmount(invoice);
        if (request.amount().compareTo(remaining) > 0) {
            throw ApiException.badRequest("مبلغ الدفعة أكبر من المتبقي على الفاتورة (المتبقي: "
                    + remaining.stripTrailingZeros().toPlainString() + ")");
        }
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل دفعة");
        }

        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
        PurchaseInvoicePayment payment = PurchaseInvoicePayment.builder()
                .purchaseInvoice(invoice).amount(request.amount()).account(account)
                .note(request.note()).createdBy(actingUser).build();
        payment = purchaseInvoicePaymentRepository.save(payment);

        if (account != null) {
            accountService.recordTransaction(request.accountId(), TxDirection.OUT, request.amount(),
                    LocalDate.now(), AccountSourceType.PURCHASE_PAYMENT, payment.getId(),
                    "دفعة فاتورة شراء رقم " + invoice.getInvoiceNumber(), actingUser);
        }

        invoice.setPaidAmount(invoice.getPaidAmount().add(request.amount()));
        return toDto(purchaseInvoiceRepository.save(invoice));
    }

    /**
     * تسجيل استرجاع نقدي من المورد - يغطي حالة "مستحق الإرجاع" (creditOwed > 0) الناتجة عن دفع كامل
     * ثم إلغاء الفاتورة أو إرجاع بضاعة منها. نفس منطق SalesInvoiceService.recordRefund لكن الاتجاه IN
     * (المورد بيرجع الفلوس للمحل، عكس استرجاع فاتورة البيع اللي بيطلع فيها الكاش من المحل للعميل).
     */
    @Transactional
    public PurchaseInvoiceDto recordRefund(Long invoiceId, PurchaseRefundRequest request, User actingUser) {
        PurchaseInvoice invoice = getOrThrow(invoiceId);
        BigDecimal owed = netCreditOwed(invoice);
        if (request.amount().compareTo(owed) > 0) {
            throw ApiException.badRequest("المبلغ أكبر من المستحق إرجاعه من المورد (المستحق: "
                    + owed.stripTrailingZeros().toPlainString() + ")");
        }
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل إرجاع");
        }

        Account account = accountService.getAccountRef(request.accountId());
        PurchaseInvoicePayment refund = PurchaseInvoicePayment.builder()
                .purchaseInvoice(invoice).amount(request.amount().negate()).account(account)
                .note("استرجاع نقدي من المورد" + (request.note() != null && !request.note().isBlank() ? ": " + request.note() : ""))
                .createdBy(actingUser).build();
        refund = purchaseInvoicePaymentRepository.save(refund);

        accountService.recordTransaction(request.accountId(), TxDirection.IN, request.amount(),
                LocalDate.now(), AccountSourceType.PURCHASE_PAYMENT, refund.getId(),
                "استرجاع نقدي - فاتورة شراء رقم " + invoice.getInvoiceNumber(), actingUser);

        invoice.setPaidAmount(invoice.getPaidAmount().subtract(request.amount()));
        return toDto(purchaseInvoiceRepository.save(invoice));
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> getPayments(Long invoiceId) {
        return purchaseInvoicePaymentRepository.findByPurchaseInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .stream().map(this::toPaymentDto).toList();
    }

    /**
     * فواتير الشراء غير المسددة - يُستبعد منها ما أصبح صافي متبقيه صفراً بعد خصم المرتجعات
     * (نفس منهجية فواتير البيع، راجع SalesInvoiceService.outstanding).
     */
    @Transactional(readOnly = true)
    public Page<PurchaseInvoiceDto> outstanding(Pageable pageable) {
        // نفس إصلاح SalesInvoiceService.outstanding: الفلترة بعد خصم المرتجعات يجب أن تتم على كامل
        // القائمة قبل التقسيم لصفحات، وإلا فإن "الإجمالي" المُرجَع يعكس فقط عناصر الصفحة الحالية.
        List<PurchaseInvoiceDto> filtered = purchaseInvoiceRepository.findAllOutstanding().stream()
                .map(this::toDto)
                .filter(dto -> dto.dueAmount().signum() > 0)
                .toList();
        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    /**
     * إجمالي المستحق لكل مورد، بعد خصم قيمة أي مرتجعات من الإجمالي (نفس منهجية SalesInvoiceService.balancesByCustomer).
     */
    @Transactional(readOnly = true)
    public List<PartyBalanceDto> balancesBySupplier() {
        List<PurchaseInvoice> outstanding = purchaseInvoiceRepository.findAllOutstanding();
        if (outstanding.isEmpty()) return List.of();

        List<Long> invoiceIds = outstanding.stream().map(PurchaseInvoice::getId).toList();
        Map<Long, BigDecimal> returnedByInvoice = new HashMap<>();
        for (Object[] row : purchaseReturnRepository.sumReturnedValueByInvoiceIds(invoiceIds)) {
            returnedByInvoice.put((Long) row[0], (BigDecimal) row[1]);
        }

        Map<Long, PartyBalanceAgg> bySupplier = new java.util.LinkedHashMap<>();
        for (PurchaseInvoice inv : outstanding) {
            BigDecimal returned = returnedByInvoice.getOrDefault(inv.getId(), BigDecimal.ZERO);
            BigDecimal netGrandTotal = inv.getGrandTotal().subtract(returned);
            BigDecimal due = netGrandTotal.subtract(inv.getPaidAmount());
            if (due.signum() <= 0) continue;

            // فاتورة بدون مورد محدد (نادر، لكن ممكن لو حُذف المورد لاحقاً - supplier_id ON DELETE SET NULL)
            // تُجمَّع تحت مفتاح ثابت بدلاً من إسقاطها من الإجمالي بالخطأ (نفس إصلاح SalesInvoiceService).
            Long supplierId = inv.getSupplier() != null ? inv.getSupplier().getId() : 0L;
            String supplierName = inv.getSupplier() != null ? inv.getSupplier().getName() : "بدون مورد محدد";
            PartyBalanceAgg agg = bySupplier.computeIfAbsent(supplierId, id -> new PartyBalanceAgg(supplierName));
            agg.invoiceCount++;
            agg.totalGrandTotal = agg.totalGrandTotal.add(netGrandTotal);
            agg.totalPaid = agg.totalPaid.add(inv.getPaidAmount());
        }

        return bySupplier.entrySet().stream()
                .map(e -> new PartyBalanceDto(
                        e.getKey(), e.getValue().name, e.getValue().invoiceCount,
                        e.getValue().totalGrandTotal, e.getValue().totalPaid,
                        e.getValue().totalGrandTotal.subtract(e.getValue().totalPaid)
                ))
                .toList();
    }

    private static class PartyBalanceAgg {
        final String name;
        long invoiceCount = 0;
        BigDecimal totalGrandTotal = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        PartyBalanceAgg(String name) { this.name = name; }
    }

    /**
     * إرجاع جزئي أو كلي من فاتورة شراء مؤكدة: ينقص الكمية المرتجعة من المخزون (البضاعة رجعت للمورد)
     * ويحسب قيمة الإرجاع تناسبياً من إجمالي السطر. إن اكتمل إرجاع كل الأصناف تتحول حالة الفاتورة إلى "مرتجعة".
     */
    @Transactional
    public PurchaseReturnDto recordReturn(Long invoiceId, PurchaseReturnRequest request, User actingUser) {
        PurchaseInvoice invoice = getOrThrow(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw ApiException.badRequest("لا يمكن الإرجاع إلا من فاتورة مؤكدة");
        }
        guardNotClosed(invoice);

        PurchaseReturn purchaseReturn = PurchaseReturn.builder()
                .purchaseInvoice(invoice)
                .returnNumber(generateReturnNumber())
                .notes(request.notes())
                .createdBy(actingUser)
                .build();

        BigDecimal totalValue = BigDecimal.ZERO;
        for (PurchaseReturnItemRequest itemReq : request.items()) {
            PurchaseInvoiceItem invoiceItem = invoice.getItems().stream()
                    .filter(it -> it.getId().equals(itemReq.invoiceItemId()))
                    .findFirst()
                    .orElseThrow(() -> ApiException.notFound("صنف الفاتورة غير موجود ضمن هذه الفاتورة"));

            BigDecimal remaining = invoiceItem.getQuantity().subtract(invoiceItem.getReturnedQuantity());
            if (itemReq.quantity().compareTo(remaining) > 0) {
                throw ApiException.badRequest("الكمية المطلوب إرجاعها من \"" + invoiceItem.getProduct().getName()
                        + "\" أكبر من المتبقي القابل للإرجاع (" + remaining.stripTrailingZeros().toPlainString() + ")");
            }

            BigDecimal available = stockService.getQuantity(invoiceItem.getProduct().getId(),
                    itemWarehouseOrDefault(invoiceItem, invoice).getId());
            if (available.compareTo(itemReq.quantity()) < 0) {
                throw ApiException.badRequest("الكمية المتوفرة من \"" + invoiceItem.getProduct().getName()
                        + "\" بالمخزن غير كافية لإتمام الإرجاع للمورد (المتوفر: "
                        + available.stripTrailingZeros().toPlainString() + ")");
            }

            BigDecimal lineValue = invoiceItem.getLineTotal()
                    .multiply(itemReq.quantity())
                    .divide(invoiceItem.getQuantity(), 3, RoundingMode.HALF_UP);

            PurchaseReturnItem returnItem = PurchaseReturnItem.builder()
                    .purchaseReturn(purchaseReturn).purchaseInvoiceItem(invoiceItem).product(invoiceItem.getProduct())
                    .quantity(itemReq.quantity()).unitPrice(invoiceItem.getUnitPrice()).lineValue(lineValue)
                    .build();
            purchaseReturn.getItems().add(returnItem);
            totalValue = totalValue.add(lineValue);

            invoiceItem.setReturnedQuantity(invoiceItem.getReturnedQuantity().add(itemReq.quantity()));

            stockService.applyMovement(invoiceItem.getProduct(), itemWarehouseOrDefault(invoiceItem, invoice), itemReq.quantity().negate(),
                    MovementType.PURCHASE_RETURN_OUT, "PURCHASE_RETURN", invoice.getId(),
                    "إرجاع لفاتورة شراء رقم " + invoice.getInvoiceNumber(), actingUser);
        }
        purchaseReturn.setTotalValue(totalValue);

        boolean fullyReturned = invoice.getItems().stream()
                .allMatch(it -> it.getReturnedQuantity().compareTo(it.getQuantity()) >= 0);
        if (fullyReturned) {
            invoice.setStatus(InvoiceStatus.RETURNED);
        }
        purchaseInvoiceRepository.save(invoice);

        return toReturnDto(purchaseReturnRepository.save(purchaseReturn));
    }

    @Transactional(readOnly = true)
    public List<PurchaseReturnDto> findReturnsByInvoice(Long invoiceId) {
        return purchaseReturnRepository.findByPurchaseInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .stream().map(this::toReturnDto).toList();
    }

    private String generateReturnNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "PR-" + datePart + "-" + suffix;
    }

    private PurchaseReturnDto toReturnDto(PurchaseReturn r) {
        List<PurchaseReturnItemDto> items = r.getItems().stream().map(it -> new PurchaseReturnItemDto(
                it.getId(), it.getPurchaseInvoiceItem().getId(), it.getProduct().getId(), it.getProduct().getName(),
                it.getProduct().getSku(), it.getQuantity(), it.getUnitPrice(), it.getLineValue()
        )).toList();
        return new PurchaseReturnDto(
                r.getId(), r.getPurchaseInvoice().getId(), r.getPurchaseInvoice().getInvoiceNumber(), r.getReturnNumber(),
                r.getTotalValue(), r.getNotes(), r.getCreatedBy() != null ? r.getCreatedBy().getFullName() : null,
                r.getCreatedAt(), items
        );
    }

    /** يحسب القيمة الفعلية المتبقية على فاتورة الشراء: الإجمالي ناقص المدفوع وناقص قيمة أي مرتجعات. */
    private BigDecimal netDueAmount(PurchaseInvoice inv) {
        BigDecimal raw = rawNetAmount(inv);
        return raw.signum() < 0 ? BigDecimal.ZERO : raw;
    }

    /** لو دفعنا للمورد أكثر من (الإجمالي ناقص المرتجعات) - المبلغ اللي يستحق المورد إرجاعه للمحل. */
    private BigDecimal netCreditOwed(PurchaseInvoice inv) {
        BigDecimal raw = rawNetAmount(inv);
        return raw.signum() < 0 ? raw.negate() : BigDecimal.ZERO;
    }

    private BigDecimal rawNetAmount(PurchaseInvoice inv) {
        // فاتورة ملغاة: كل البضاعة رجعت للمورد بالكامل (إلغاء = إرجاع شامل ضمنياً)، فأي مبلغ سبق
        // دفعه للمورد (paidAmount) يستحق للمحل استرجاعه بالكامل - نفس منهجية SalesInvoiceService.
        if (inv.getStatus() == InvoiceStatus.CANCELLED) {
            return inv.getPaidAmount().negate();
        }
        BigDecimal returned = purchaseReturnRepository.sumReturnedValueByInvoiceId(inv.getId());
        return inv.getGrandTotal().subtract(inv.getPaidAmount()).subtract(returned);
    }

    private PaymentDto toPaymentDto(PurchaseInvoicePayment p) {
        return new PaymentDto(
                p.getId(), p.getAmount(), null, p.getNote(),
                p.getAccount() != null ? p.getAccount().getName() : null,
                p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : null, p.getCreatedAt()
        );
    }

    @Transactional
    public void cancel(Long id, User actingUser) {
        PurchaseInvoice invoice = getOrThrow(id);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw ApiException.badRequest("الفاتورة ملغاة مسبقاً");
        }
        guardNotClosed(invoice);
        // عكس حركات المخزون - فقط الكمية غير المرتجعة سابقاً، لتفادي عكسها مرتين (مرة بالإرجاع ومرة بالإلغاء)
        for (PurchaseInvoiceItem item : invoice.getItems()) {
            BigDecimal notYetReturned = item.getQuantity().subtract(item.getReturnedQuantity());
            if (notYetReturned.signum() <= 0) continue;
            stockService.applyMovement(item.getProduct(), itemWarehouseOrDefault(item, invoice), notYetReturned.negate(),
                    MovementType.ADJUSTMENT_OUT, "PURCHASE_INVOICE_CANCEL", invoice.getId(),
                    "إلغاء فاتورة شراء رقم " + invoice.getInvoiceNumber(), actingUser);
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        purchaseInvoiceRepository.save(invoice);
    }

    /** يحل مخزن السطر: المخزن المحدد صراحةً لهذا السطر إن وُجد، وإلا مخزن الفاتورة الافتراضي. */
    private Warehouse resolveItemWarehouse(InvoiceItemRequest itemReq, Warehouse defaultWarehouse) {
        if (itemReq.warehouseId() == null || itemReq.warehouseId().equals(defaultWarehouse.getId())) {
            return defaultWarehouse;
        }
        return warehouseRepository.findById(itemReq.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن المحدد للصنف غير موجود"));
    }

    /** للتوافق مع الفواتير القديمة قبل إضافة مخزن السطر (حيث تكون فارغة) - يُستخدم مخزن الفاتورة كبديل. */
    private Warehouse itemWarehouseOrDefault(PurchaseInvoiceItem item, PurchaseInvoice invoice) {
        return item.getWarehouse() != null ? item.getWarehouse() : invoice.getWarehouse();
    }

    private String generateInvoiceNumber() {
        // يعتمد على قيد UNIQUE في قاعدة البيانات + عدد فواتير اليوم؛ مناسب لحجم استخدام محل واحد أو عدة فروع بمعدل عادي.
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = purchaseInvoiceRepository.countByCreatedAtAfter(LocalDate.now().atStartOfDay());
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "PI-" + datePart + "-" + String.format("%04d", countToday + 1) + "-" + suffix;
    }

    private PurchaseInvoice getOrThrow(Long id) {
        return purchaseInvoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("فاتورة الشراء غير موجودة"));
    }

    private PurchaseInvoiceDto toDto(PurchaseInvoice inv) {
        List<InvoiceItemDto> items = inv.getItems().stream().map(it -> {
            Warehouse w = itemWarehouseOrDefault(it, inv);
            return new InvoiceItemDto(
                    it.getId(), it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                    it.getProduct().getUnit().getName(), w.getId(), w.getName(),
                    it.getQuantity(), it.getUnitPrice(), it.getTaxRate(),
                    it.getDiscount(), it.getLineTotal(), it.getReturnedQuantity()
            );
        }).toList();

        return new PurchaseInvoiceDto(
                inv.getId(), inv.getInvoiceNumber(),
                inv.getSupplier() != null ? inv.getSupplier().getId() : null,
                inv.getSupplier() != null ? inv.getSupplier().getName() : null,
                inv.getSupplier() != null ? inv.getSupplier().getTaxNumber() : null,
                inv.getWarehouse().getId(), inv.getWarehouse().getName(),
                inv.getBranch().getId(), inv.getBranch().getName(),
                inv.getStatus().name(), inv.getSubtotal(), inv.getTaxTotal(), inv.getDiscountTotal(),
                inv.getGrandTotal(), inv.getPaidAmount(), netDueAmount(inv), netCreditOwed(inv), inv.getNotes(),
                inv.getDueDate(),
                inv.getCreatedBy() != null ? inv.getCreatedBy().getFullName() : null,
                inv.getCreatedAt(), items
        );
    }
}
