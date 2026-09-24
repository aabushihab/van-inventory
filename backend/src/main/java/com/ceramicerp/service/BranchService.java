package com.ceramicerp.service;

import com.ceramicerp.dto.BranchDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Branch;
import com.ceramicerp.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    public List<BranchDto> findAll() {
        return branchRepository.findAll().stream().map(this::toDto).toList();
    }

    public BranchDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public BranchDto create(BranchDto dto) {
        Branch branch = Branch.builder()
                .name(dto.name()).nameEn(dto.nameEn()).address(dto.address()).phone(dto.phone())
                .active(true).build();
        return toDto(branchRepository.save(branch));
    }

    @Transactional
    public BranchDto update(Long id, BranchDto dto) {
        Branch branch = getOrThrow(id);
        branch.setName(dto.name());
        branch.setNameEn(dto.nameEn());
        branch.setAddress(dto.address());
        branch.setPhone(dto.phone());
        branch.setActive(dto.active());
        return toDto(branchRepository.save(branch));
    }

    @Transactional
    public void delete(Long id) {
        Branch branch = getOrThrow(id);
        branchRepository.delete(branch);
    }

    private Branch getOrThrow(Long id) {
        return branchRepository.findById(id).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
    }

    private BranchDto toDto(Branch b) {
        return new BranchDto(b.getId(), b.getName(), b.getNameEn(), b.getAddress(), b.getPhone(), b.isActive());
    }
}
