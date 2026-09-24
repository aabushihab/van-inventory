package com.ceramicerp.service;

import com.ceramicerp.dto.WarehouseDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Branch;
import com.ceramicerp.model.Warehouse;
import com.ceramicerp.repository.BranchRepository;
import com.ceramicerp.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public List<WarehouseDto> findAll() {
        return warehouseRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseDto> findByBranch(Long branchId) {
        return warehouseRepository.findByBranchId(branchId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public WarehouseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public WarehouseDto create(WarehouseDto dto) {
        Branch branch = branchRepository.findById(dto.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Warehouse warehouse = Warehouse.builder()
                .branch(branch).name(dto.name()).nameEn(dto.nameEn()).location(dto.location())
                .isDefault(dto.isDefault()).active(true).build();
        return toDto(warehouseRepository.save(warehouse));
    }

    @Transactional
    public WarehouseDto update(Long id, WarehouseDto dto) {
        Warehouse warehouse = getOrThrow(id);
        Branch branch = branchRepository.findById(dto.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        warehouse.setBranch(branch);
        warehouse.setName(dto.name());
        warehouse.setNameEn(dto.nameEn());
        warehouse.setLocation(dto.location());
        warehouse.setDefault(dto.isDefault());
        warehouse.setActive(dto.active());
        return toDto(warehouseRepository.save(warehouse));
    }

    @Transactional
    public void delete(Long id) {
        warehouseRepository.delete(getOrThrow(id));
    }

    private Warehouse getOrThrow(Long id) {
        return warehouseRepository.findById(id).orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
    }

    private WarehouseDto toDto(Warehouse w) {
        return new WarehouseDto(w.getId(), w.getBranch().getId(), w.getBranch().getName(),
                w.getName(), w.getNameEn(), w.getLocation(), w.isDefault(), w.isActive());
    }
}
