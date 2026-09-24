package com.vanerp.service;

import com.vanerp.dto.InvoiceItemRequest;
import com.vanerp.dto.SalesInvoiceCreateRequest;
import com.vanerp.dto.SalesInvoiceDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.User;
import com.vanerp.model.Van;
import com.vanerp.repository.VanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * قيود مندوب المبيعات: المستخدم المربوط بسيارة توزيع (وليس لديه صلاحية إدارة السيارات) يبيع فقط
 * من مخزن سيارته، فلا يستطيع بيع بضاعة ليست محمّلة معه. كفاية الكمية يتحقق منها منطق الفاتورة نفسه.
 */
@Service
@RequiredArgsConstructor
public class VanAccessService {

    private final VanRepository vanRepository;

    @Transactional(readOnly = true)
    public Optional<Van> findVanOf(User user) {
        if (user == null) return Optional.empty();
        return vanRepository.findFirstBySalesmanIdAndActiveTrue(user.getId());
    }

    /** true إن كان المستخدم مندوباً مقيّداً بسيارته (مربوط بسيارة ولا يملك صلاحية VAN_MANAGE). */
    @Transactional(readOnly = true)
    public boolean isRestrictedSalesman(User user) {
        return findVanOf(user).isPresent() && !hasPermission(user, "VAN_MANAGE");
    }

    @Transactional(readOnly = true)
    public void enforceSalesmanWarehouse(User user, SalesInvoiceCreateRequest request) {
        if (!isRestrictedSalesman(user)) return;
        Long vanWarehouseId = findVanOf(user).get().getWarehouse().getId();
        boolean ok = vanWarehouseId.equals(request.warehouseId());
        for (InvoiceItemRequest item : request.items()) {
            if (item.warehouseId() != null && !vanWarehouseId.equals(item.warehouseId())) ok = false;
        }
        if (!ok) {
            throw ApiException.forbidden("مندوب المبيعات يبيع فقط من البضاعة المحمّلة على سيارته");
        }
        Van van = findVanOf(user).get();
        if (request.accountId() != null && van.getCashAccount() != null
                && !van.getCashAccount().getId().equals(request.accountId())) {
            throw ApiException.forbidden("المبالغ المحصّلة من المندوب تُسجَّل في صندوق سيارته فقط");
        }
    }

    /** مخزن سيارة المندوب المقيّد، أو null لغير المقيّدين (يرون كل الفواتير). */
    @Transactional(readOnly = true)
    public Long restrictedWarehouseId(User user) {
        return isRestrictedSalesman(user) ? findVanOf(user).get().getWarehouse().getId() : null;
    }

    /** المندوب المقيّد يرى ويطبع فواتيره هو فقط (التي أنشأها من سيارته). */
    @Transactional(readOnly = true)
    public void assertCanView(User user, SalesInvoiceDto invoice) {
        Long own = restrictedWarehouseId(user);
        if (own != null && (!own.equals(invoice.warehouseId()) || !user.getId().equals(invoice.createdById()))) {
            throw ApiException.forbidden("هذه الفاتورة ليست من سيارتك");
        }
    }

    /** المندوب يحصّل ويستلم مرتجعات فواتير سيارته (أي سائق عليها) - وليس فواتير المستودع أو سيارات أخرى. */
    @Transactional(readOnly = true)
    public void assertVanInvoice(User user, SalesInvoiceDto invoice) {
        Long own = restrictedWarehouseId(user);
        if (own != null && !own.equals(invoice.warehouseId())) {
            throw ApiException.forbidden("هذه الفاتورة ليست من سيارتك");
        }
    }

    /** صندوق سيارة المندوب المقيّد (المبالغ التي يحصّلها تدخل هنا فقط)، أو null. */
    @Transactional(readOnly = true)
    public Long restrictedCashAccountId(User user) {
        if (!isRestrictedSalesman(user)) return null;
        Van van = findVanOf(user).get();
        return van.getCashAccount() != null ? van.getCashAccount().getId() : null;
    }

    /** عمليات التعديل/الإلغاء/الإرجاع/الدفعات والتقارير الشاملة ليست متاحة للمندوب - البيع فقط. */
    @Transactional(readOnly = true)
    public void assertNotRestricted(User user) {
        if (isRestrictedSalesman(user)) {
            throw ApiException.forbidden("مندوب المبيعات يستطيع إنشاء فواتير البيع من سيارته فقط");
        }
    }

    private boolean hasPermission(User user, String code) {
        return user.getRole() != null && user.getRole().getPermissions().stream()
                .anyMatch(p -> code.equals(p.getCode()));
    }
}
