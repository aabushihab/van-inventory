package com.ceramicerp.repository;

import com.ceramicerp.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySku(String sku);

    Optional<Product> findByBarcode(String barcode);

    boolean existsBySku(String sku);

    boolean existsByBarcode(String barcode);

    @Query("""
        SELECT p FROM Product p
        WHERE (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(p.nameEn) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(p.sku) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
          AND (:categoryId IS NULL OR p.category.id = :categoryId)
          AND (:activeOnly = FALSE OR p.active = TRUE)
        ORDER BY p.name
        """)
    Page<Product> search(@Param("q") String q,
                          @Param("categoryId") Long categoryId,
                          @Param("activeOnly") boolean activeOnly,
                          Pageable pageable);
}
