package com.ceramicerp.repository;

import com.ceramicerp.model.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    List<Warehouse> findByBranchId(Long branchId);
}
