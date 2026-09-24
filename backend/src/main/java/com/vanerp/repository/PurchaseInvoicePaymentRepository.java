package com.vanerp.repository;

import com.vanerp.model.PurchaseInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseInvoicePaymentRepository extends JpaRepository<PurchaseInvoicePayment, Long> {
    List<PurchaseInvoicePayment> findByPurchaseInvoiceIdOrderByCreatedAtDesc(Long purchaseInvoiceId);
}
