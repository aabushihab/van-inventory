package com.vanerp.repository;

import com.vanerp.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("""
        SELECT c FROM Customer c
        WHERE (:q IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR c.phone LIKE CONCAT('%', CAST(:q AS string), '%'))
        ORDER BY c.name
        """)
    List<Customer> search(@Param("q") String q);

    @Query("""
        SELECT c FROM Customer c
        WHERE (:q IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR c.phone LIKE CONCAT('%', CAST(:q AS string), '%'))
        """)
    Page<Customer> searchPage(@Param("q") String q, Pageable pageable);
}
