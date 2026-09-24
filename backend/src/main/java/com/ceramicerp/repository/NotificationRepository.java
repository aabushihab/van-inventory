package com.ceramicerp.repository;

import com.ceramicerp.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByReadFalse();

    boolean existsByRelatedProductIdAndRelatedWarehouseIdAndReadFalse(Long productId, Long warehouseId);

    boolean existsByRelatedSalesInvoiceIdAndReadFalse(Long salesInvoiceId);
    boolean existsByRelatedPurchaseInvoiceIdAndReadFalse(Long purchaseInvoiceId);
}
