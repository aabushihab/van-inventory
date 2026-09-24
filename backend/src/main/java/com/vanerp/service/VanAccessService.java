package com.vanerp.service;

import com.vanerp.dto.InvoiceItemRequest;
import com.vanerp.dto.SalesInvoiceCreateRequest;
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
    }

    private boolean hasPermission(User user, String code) {
        return user.getRole() != null && user.getRole().getPermissions().stream()
                .anyMatch(p -> code.equals(p.getCode()));
    }
}
