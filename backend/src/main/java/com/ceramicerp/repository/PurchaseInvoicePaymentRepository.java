package com.ceramicerp.repository;

import com.ceramicerp.model.PurchaseInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseInvoicePaymentRepository extends JpaRepository<PurchaseInvoicePayment, Long> {
    List<PurchaseInvoicePayment> findByPurchaseInvoiceIdOrderByCreatedAtDesc(Long purchaseInvoiceId);
}
