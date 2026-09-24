package com.vanerp.repository;

import com.vanerp.model.SalesInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalesInvoicePaymentRepository extends JpaRepository<SalesInvoicePayment, Long> {
    List<SalesInvoicePayment> findBySalesInvoiceIdOrderByCreatedAtDesc(Long salesInvoiceId);
}
