package com.ceramicerp.repository;

import com.ceramicerp.model.SalesInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalesInvoicePaymentRepository extends JpaRepository<SalesInvoicePayment, Long> {
    List<SalesInvoicePayment> findBySalesInvoiceIdOrderByCreatedAtDesc(Long salesInvoiceId);
}
