package com.vanerp.service;

import com.vanerp.dto.CashHandoverDto;
import com.vanerp.dto.CashHandoverRequest;
import com.vanerp.dto.TransferRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.VanCashHandoverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * تسليم كاش السائق آخر الجولة: المتوقع = رصيد صندوق السيارة (ما حصّله من مبيعات وديون).
 * المسلَّم يُحوَّل من صندوق السيارة للصندوق المستلم. إن نقص عن المتوقع يُسجَّل الفرق عجز كاش على السائق
 * (ويُخرج من صندوق السيارة ليصير رصيده صفراً)، وإن زاد تُسجَّل الزيادة دخلاً في صندوق السيارة قبل التحويل.
 */
@Service
@RequiredArgsConstructor
public class VanCashService {

    private final VanCashHandoverRepository handoverRepository;
    private final VanService vanService;
    private final AccountService accountService;
    private final VanShortageService vanShortageService;

    @Transactional(readOnly = true)
    public BigDecimal expected(Van van) {
        return van.getCashAccount() != null ? accountService.balanceOf(van.getCashAccount().getId()) : BigDecimal.ZERO;
    }

    @Transactional
    public CashHandoverDto handover(Long vanId, CashHandoverRequest request, User actingUser) {
        Van van = vanService.getOrThrow(vanId);
        if (van.getCashAccount() == null) throw ApiException.badRequest("لا يوجد صندوق لهذه السيارة");
        Long boxId = van.getCashAccount().getId();
        if (boxId.equals(request.toAccountId())) throw ApiException.badRequest("اختر صندوقاً غير صندوق السيارة نفسها");

        BigDecimal expected = expected(van);
        BigDecimal handed = request.handedAmount();
        BigDecimal diff = handed.subtract(expected);
        LocalDate today = LocalDate.now();
        String driver = van.getDriver() != null ? van.getDriver().getName() : van.getDriverName();
        String label = "تسليم كاش سيارة " + van.getName() + (driver != null ? " - " + driver : "");

        if (diff.signum() > 0) {
            accountService.recordTransaction(boxId, TxDirection.IN, diff, today, AccountSourceType.MANUAL, null,
                    "زيادة عند " + label, actingUser);
        }
        VanShortage shortage = null;
        if (diff.signum() < 0) {
            shortage = vanShortageService.recordCash(van, diff.negate(), "عجز عند " + label
                    + (request.notes() != null && !request.notes().isBlank() ? " - " + request.notes() : ""), actingUser);
            accountService.recordTransaction(boxId, TxDirection.OUT, diff.negate(), today, AccountSourceType.MANUAL, null,
                    "عجز كاش على السائق عند " + label, actingUser);
        }
        if (handed.signum() > 0) {
            accountService.transfer(new TransferRequest(boxId, request.toAccountId(), handed, today, label), actingUser);
        }

        VanCashHandover h = handoverRepository.save(VanCashHandover.builder()
                .van(van).driverName(driver).expectedAmount(expected).handedAmount(handed).difference(diff)
                .toAccount(accountService.getAccountRef(request.toAccountId())).shortage(shortage)
                .notes(request.notes()).createdBy(actingUser).build());
        return toDto(h);
    }

    @Transactional(readOnly = true)
    public List<CashHandoverDto> list(Long vanId, LocalDate from, LocalDate to) {
        LocalDateTime start = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(3000, 1, 1, 0, 0);
        return handoverRepository.findByVanIdAndCreatedAtBetweenOrderByCreatedAtDesc(vanId, start, end)
                .stream().map(this::toDto).toList();
    }

    private CashHandoverDto toDto(VanCashHandover h) {
        return new CashHandoverDto(h.getId(), h.getVan().getId(), h.getVan().getName(), h.getDriverName(),
                h.getExpectedAmount(), h.getHandedAmount(), h.getDifference(),
                h.getToAccount() != null ? h.getToAccount().getName() : null,
                h.getShortage() != null ? h.getShortage().getId() : null, h.getNotes(),
                h.getCreatedBy() != null ? h.getCreatedBy().getFullName() : null, h.getCreatedAt());
    }
}
