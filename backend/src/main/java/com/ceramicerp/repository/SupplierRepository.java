package com.ceramicerp.repository;

import com.ceramicerp.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    @Query("""
        SELECT s FROM Supplier s
        WHERE (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR s.phone LIKE CONCAT('%', CAST(:q AS string), '%'))
        ORDER BY s.name
        """)
    List<Supplier> search(@Param("q") String q);

    @Query("""
        SELECT s FROM Supplier s
        WHERE (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR s.phone LIKE CONCAT('%', CAST(:q AS string), '%'))
        """)
    Page<Supplier> searchPage(@Param("q") String q, Pageable pageable);
}
