package com.ceramicerp.controller;

import com.ceramicerp.dto.WarehouseDto;
import com.ceramicerp.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping
    public List<WarehouseDto> findAll(@RequestParam(required = false) Long branchId) {
        return branchId != null ? warehouseService.findByBranch(branchId) : warehouseService.findAll();
    }

    @GetMapping("/{id}")
    public WarehouseDto findById(@PathVariable Long id) {
        return warehouseService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('WAREHOUSE_MANAGE')")
    public ResponseEntity<WarehouseDto> create(@Valid @RequestBody WarehouseDto dto) {
        return ResponseEntity.ok(warehouseService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('WAREHOUSE_MANAGE')")
    public WarehouseDto update(@PathVariable Long id, @Valid @RequestBody WarehouseDto dto) {
        return warehouseService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('WAREHOUSE_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        warehouseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
