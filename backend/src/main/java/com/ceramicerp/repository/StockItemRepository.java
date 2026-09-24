package com.ceramicerp.repository;

import com.ceramicerp.model.StockItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockItemRepository extends JpaRepository<StockItem, Long> {

    Optional<StockItem> findByProductIdAndWarehouseId(Long productId, Long warehouseId);

    List<StockItem> findByWarehouseId(Long warehouseId);

    List<StockItem> findByProductId(Long productId);

    @Query("""
        SELECT si FROM StockItem si
        JOIN si.product p
        WHERE si.warehouse.id = :warehouseId
          AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(p.sku) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
          AND (:categoryId = -1 OR p.category.id = :categoryId)
        ORDER BY p.name
        """)
    Page<StockItem> searchByWarehouse(@Param("warehouseId") Long warehouseId, @Param("q") String q,
                                       @Param("categoryId") Long categoryId, Pageable pageable);

    @Query("""
        SELECT si FROM StockItem si
        JOIN si.product p
        WHERE p.minStockThreshold > 0 AND si.quantity <= p.minStockThreshold AND p.active = TRUE
        """)
    List<StockItem> findLowStockItems();

    @Query("""
        SELECT si FROM StockItem si
        JOIN si.product p
        WHERE si.warehouse.id = :warehouseId
          AND p.minStockThreshold > 0 AND si.quantity <= p.minStockThreshold AND p.active = TRUE
        """)
    List<StockItem> findLowStockItemsByWarehouse(@Param("warehouseId") Long warehouseId);
}
