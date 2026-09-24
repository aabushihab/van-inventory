package com.vanerp.service;

import com.vanerp.dto.*;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.NotificationRepository;
import com.vanerp.repository.VanShortageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * عجز السائقين: يُنشأ من جرد السيارة (VanLoadService.close) ويُحسم بخصم من الراتب أو دفع نقدي أو مسامحة.
 * الدفع النقدي يُسجَّل كحركة داخلة على الحساب المختار (مصدرها VAN_SHORTAGE) ويُعكس عند إرجاع العجز لمستحق.
 */
@Service
@RequiredArgsConstructor
public class VanShortageService {

    private final VanShortageRepository vanShortageRepository;
    private final NotificationRepository notificationRepository;
    private final CompanySettingsService companySettingsService;
    private final AccountService accountService;

    /** سعر الوحدة للعجز حسب طريقة التسعير. */
    public BigDecimal unitPrice(Product product, String pricing) {
        BigDecimal price = "COST".equals(pricing) ? product.getPurchasePrice() : product.getSalePrice();
        return price != null ? price : BigDecimal.ZERO;
    }

    /** طريقة التسعير المطلوبة، أو الافتراضية من الإعدادات. */
    public String resolvePricing(String requested) {
        if (requested == null || requested.isBlank()) return companySettingsService.getOrCreate().getShortagePricing();
        if (!requested.equals("SALE") && !requested.equals("COST")) throw ApiException.badRequest("طريقة تسعير العجز غير صحيحة");
        return requested;
    }

    /** تسجيل عجز من جرد السيارة. shortages: الصنف ← الكمية الناقصة (موجبة). */
    @Transactional
    public VanShortage record(Van van, Map<Product, BigDecimal> shortages, String pricing, String notes, User actingUser) {
        if (shortages.isEmpty()) return null;
        VanShortage shortage = VanShortage.builder()
                .van(van).driver(van.getDriver())
                .driverName(van.getDriver() != null ? van.getDriver().getName() : van.getDriverName())
                .salesman(van.getSalesman()).pricing(pricing).notes(notes).createdBy(actingUser)
                .totalValue(BigDecimal.ZERO)
                .build();
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Product, BigDecimal> e : shortages.entrySet()) {
            BigDecimal price = unitPrice(e.getKey(), pricing);
            BigDecimal value = e.getValue().multiply(price).setScale(3, RoundingMode.HALF_UP);
            shortage.getItems().add(VanShortageItem.builder().shortage(shortage).product(e.getKey())
                    .quantity(e.getValue()).unitPrice(price).lineValue(value).build());
            total = total.add(value);
        }
        shortage.setTotalValue(total);
        shortage = vanShortageRepository.save(shortage);

        BigDecimal threshold = companySettingsService.getOrCreate().getShortageAlertThreshold();
        if (threshold == null || total.compareTo(threshold) >= 0) {
            notificationRepository.save(Notification.builder()
                    .type(NotificationType.VAN_SHORTAGE)
                    .title("عجز على سائق: " + (shortage.getDriverName() != null ? shortage.getDriverName() : van.getName()))
                    .message(String.format("تم تسجيل عجز بقيمة %s (%s) على السيارة \"%s\" (%s) عند الجرد - %d صنف.",
                            total.stripTrailingZeros().toPlainString(), "COST".equals(pricing) ? "بسعر التكلفة" : "بسعر البيع",
                            van.getName(), van.getPlateNumber(), shortage.getItems().size()))
                    .relatedWarehouse(van.getWarehouse())
                    .alertKey("VAN_SHORTAGE:" + shortage.getId())
                    .read(false).build());
        }
        return shortage;
    }

    /** تسجيل عجز كاش (نقص المبلغ المسلَّم عن المتوقع في صندوق السيارة). */
    @Transactional
    public VanShortage recordCash(Van van, BigDecimal amount, String notes, User actingUser) {
        VanShortage shortage = vanShortageRepository.save(VanShortage.builder()
                .van(van).driver(van.getDriver())
                .driverName(van.getDriver() != null ? van.getDriver().getName() : van.getDriverName())
                .salesman(van.getSalesman()).shortageType("CASH").pricing("SALE")
                .totalValue(amount).notes(notes).createdBy(actingUser).build());
        notificationRepository.save(Notification.builder()
                .type(NotificationType.VAN_SHORTAGE)
                .title("عجز كاش على سائق: " + (shortage.getDriverName() != null ? shortage.getDriverName() : van.getName()))
                .message(String.format("عند تسليم صندوق السيارة \"%s\" نقص مبلغ %s عن المتوقع.",
                        van.getName(), amount.stripTrailingZeros().toPlainString()))
                .relatedWarehouse(van.getWarehouse()).alertKey("VAN_SHORTAGE:" + shortage.getId()).read(false).build());
        return shortage;
    }

    @Transactional(readOnly = true)
    public Page<VanShortageDto> search(Long vanId, Long driverId, String status, LocalDate from, LocalDate to, Pageable pageable) {
        LocalDateTime start = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(3000, 1, 1, 0, 0);
        ShortageStatus st = status != null && !status.isBlank() ? ShortageStatus.valueOf(status) : null;
        return vanShortageRepository.search(vanId, driverId, st, start, end, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public VanShortageDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    /** ملخص لكل سائق: المستحق عليه والإجمالي. */
    @Transactional(readOnly = true)
    public List<DriverShortageSummaryDto> summaryByDriver() {
        Map<String, long[]> counts = new LinkedHashMap<>();
        Map<String, BigDecimal[]> values = new LinkedHashMap<>();
        Map<String, Long> ids = new HashMap<>();
        Map<String, String> names = new HashMap<>();
        for (VanShortage s : vanShortageRepository.findAllByOrderByCreatedAtDesc()) {
            String key = s.getDriver() != null ? "E" + s.getDriver().getId() : "N" + s.getDriverName();
            ids.put(key, s.getDriver() != null ? s.getDriver().getId() : null);
            names.putIfAbsent(key, s.getDriver() != null ? s.getDriver().getName() : s.getDriverName());
            long[] c = counts.computeIfAbsent(key, k -> new long[2]);
            BigDecimal[] v = values.computeIfAbsent(key, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            c[1]++;
            v[1] = v[1].add(s.getTotalValue());
            if (s.getStatus() == ShortageStatus.PENDING) {
                c[0]++;
                v[0] = v[0].add(s.getTotalValue());
            }
        }
        List<DriverShortageSummaryDto> result = new ArrayList<>();
        for (String key : counts.keySet()) {
            result.add(new DriverShortageSummaryDto(ids.get(key), names.get(key),
                    counts.get(key)[0], values.get(key)[0], counts.get(key)[1], values.get(key)[1]));
        }
        result.sort(Comparator.comparing(DriverShortageSummaryDto::pendingValue).reversed());
        return result;
    }

    /** خصومات العجز على رواتب شهر معيّن: الموظف ← المبلغ (لشاشة الموظفين). */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> salaryDeductions(int year, int month) {
        Map<Long, BigDecimal> result = new HashMap<>();
        for (VanShortage s : vanShortageRepository.findByStatusAndSalaryYearAndSalaryMonth(ShortageStatus.SALARY_DEDUCTED, year, month)) {
            if (s.getDriver() == null) continue;
            result.merge(s.getDriver().getId(), s.getTotalValue(), BigDecimal::add);
        }
        return result;
    }

    /** خصومات العجز على راتب موظف لكل شهر من سنة: الشهر ← المبلغ (لكشف الراتب ونافذة صرف الراتب). */
    @Transactional(readOnly = true)
    public Map<Integer, BigDecimal> employeeYearDeductions(Long employeeId, int year) {
        Map<Integer, BigDecimal> result = new TreeMap<>();
        for (VanShortage s : vanShortageRepository.findByStatusAndDriverIdAndSalaryYear(ShortageStatus.SALARY_DEDUCTED, employeeId, year)) {
            result.merge(s.getSalaryMonth(), s.getTotalValue(), BigDecimal::add);
        }
        return result;
    }

    @Transactional
    public VanShortageDto settle(Long id, ShortageSettleRequest request, User actingUser) {
        VanShortage s = getOrThrow(id);
        if (s.getStatus() != ShortageStatus.PENDING) throw ApiException.badRequest("هذا العجز محسوم مسبقاً");
        ShortageStatus method = ShortageStatus.valueOf(request.method());

        switch (method) {
            case SALARY_DEDUCTED -> {
                if (s.getDriver() == null) throw ApiException.badRequest("لا يوجد موظف سائق مرتبط بهذا العجز للخصم من راتبه");
                if (request.salaryYear() == null || request.salaryMonth() == null
                        || request.salaryMonth() < 1 || request.salaryMonth() > 12) {
                    throw ApiException.badRequest("حدد سنة وشهر الراتب الذي يُخصم منه العجز");
                }
                s.setSalaryYear(request.salaryYear());
                s.setSalaryMonth(request.salaryMonth());
            }
            case PAID -> {
                if (request.accountId() == null) throw ApiException.badRequest("اختر الصندوق/الحساب الذي استُلم فيه المبلغ");
                accountService.recordTransaction(request.accountId(), TxDirection.IN, s.getTotalValue(), LocalDate.now(),
                        AccountSourceType.VAN_SHORTAGE, s.getId(),
                        "تحصيل عجز من السائق " + (s.getDriverName() != null ? s.getDriverName() : "") + " - سيارة " + s.getVan().getName(),
                        actingUser);
                s.setAccount(accountService.getAccountRef(request.accountId()));
            }
            case WAIVED -> {
                if (request.note() == null || request.note().isBlank()) throw ApiException.badRequest("اكتب سبب المسامحة");
            }
            default -> throw ApiException.badRequest("طريقة الحسم غير صحيحة");
        }
        s.setStatus(method);
        s.setSettlementNote(request.note());
        s.setSettledAt(LocalDateTime.now());
        s.setSettledBy(actingUser);
        return toDto(vanShortageRepository.save(s));
    }

    /** إرجاع العجز لحالة "مستحق" (تصحيح خطأ) - يُحذف قيد الدفع النقدي إن وُجد. */
    @Transactional
    public VanShortageDto reopen(Long id, User actingUser) {
        VanShortage s = getOrThrow(id);
        if (s.getStatus() == ShortageStatus.PENDING) throw ApiException.badRequest("العجز مستحق أصلاً");
        if (s.getStatus() == ShortageStatus.PAID) accountService.deleteBySource(AccountSourceType.VAN_SHORTAGE, s.getId());
        s.setStatus(ShortageStatus.PENDING);
        s.setSalaryYear(null);
        s.setSalaryMonth(null);
        s.setAccount(null);
        s.setSettlementNote(null);
        s.setSettledAt(null);
        s.setSettledBy(null);
        return toDto(vanShortageRepository.save(s));
    }

    private VanShortage getOrThrow(Long id) {
        return vanShortageRepository.findById(id).orElseThrow(() -> ApiException.notFound("سجل العجز غير موجود"));
    }

    private VanShortageDto toDto(VanShortage s) {
        List<VanShortageItemDto> items = s.getItems().stream().map(it -> new VanShortageItemDto(
                it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                it.getQuantity(), it.getUnitPrice(), it.getLineValue())).toList();
        return new VanShortageDto(s.getId(), s.getVan().getId(), s.getVan().getName(), s.getVan().getPlateNumber(),
                s.getDriver() != null ? s.getDriver().getId() : null, s.getDriverName(), s.getShortageType(), s.getPricing(), s.getTotalValue(),
                s.getStatus().name(), s.getSalaryYear(), s.getSalaryMonth(),
                s.getAccount() != null ? s.getAccount().getName() : null, s.getSettlementNote(), s.getSettledAt(),
                s.getSettledBy() != null ? s.getSettledBy().getFullName() : null, s.getNotes(),
                s.getCreatedBy() != null ? s.getCreatedBy().getFullName() : null, s.getCreatedAt(), items);
    }
}
