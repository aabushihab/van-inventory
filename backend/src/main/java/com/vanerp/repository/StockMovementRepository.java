package com.vanerp.repository;

import com.vanerp.model.MovementType;
import com.vanerp.model.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    boolean existsByWarehouseId(Long warehouseId);

    @Query(value = """
        SELECT m FROM StockMovement m
        JOIN FETCH m.product p
        JOIN FETCH m.warehouse w
        WHERE (:productId IS NULL OR p.id = :productId)
          AND (:warehouseId IS NULL OR w.id = :warehouseId)
          AND m.createdAt >= :from AND m.createdAt < :to
        ORDER BY m.createdAt DESC
        """,
        countQuery = """
        SELECT COUNT(m) FROM StockMovement m
        WHERE (:productId IS NULL OR m.product.id = :productId)
          AND (:warehouseId IS NULL OR m.warehouse.id = :warehouseId)
          AND m.createdAt >= :from AND m.createdAt < :to
        """)
    Page<StockMovement> search(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId,
                                @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    Page<StockMovement> findByMovementTypeOrderByCreatedAtDesc(MovementType movementType, Pageable pageable);
    Page<StockMovement> findByMovementTypeAndProductIdOrderByCreatedAtDesc(MovementType movementType, Long productId, Pageable pageable);
    Page<StockMovement> findByMovementTypeAndWarehouseIdOrderByCreatedAtDesc(MovementType movementType, Long warehouseId, Pageable pageable);

    @Query("""
        SELECT m FROM StockMovement m
        JOIN FETCH m.product p
        JOIN FETCH m.warehouse w
        WHERE m.createdAt >= :from AND m.createdAt < :to
          AND (:warehouseId IS NULL OR w.id = :warehouseId)
        ORDER BY m.createdAt ASC
        """)
    List<StockMovement> findForSummaryBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to,
                                               @Param("warehouseId") Long warehouseId);

    /** حركات التلف (DAMAGED) ضمن فترة، لاحتساب خسارة التوالف غير المعوَّضة بالتقرير المالي. */
    @Query("""
        SELECT m FROM StockMovement m
        JOIN FETCH m.product p
        WHERE m.movementType = com.vanerp.model.MovementType.DAMAGED
          AND m.createdAt >= :from AND m.createdAt < :to
        """)
    List<StockMovement> findDamagedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** رصيد كل صنف في مخزن معيّن قبل لحظة معيّنة (رصيد أول المدة لتسوية السيارة). [productId, sum] */
    @Query("""
        SELECT m.product.id, SUM(m.quantity) FROM StockMovement m
        WHERE m.warehouse.id = :warehouseId AND m.createdAt < :before
        GROUP BY m.product.id
        """)
    List<Object[]> sumByProductBefore(@Param("warehouseId") Long warehouseId, @Param("before") LocalDateTime before);

    @Query("""
        SELECT m FROM StockMovement m
        JOIN FETCH m.product p
        WHERE m.warehouse.id = :warehouseId AND m.createdAt >= :from AND m.createdAt < :to
        """)
    List<StockMovement> findByWarehouseBetween(@Param("warehouseId") Long warehouseId,
                                               @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
