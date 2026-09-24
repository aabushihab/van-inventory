package com.vanerp.controller;

import com.vanerp.dto.BranchDto;
import com.vanerp.service.BranchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @GetMapping
    public List<BranchDto> findAll() {
        return branchService.findAll();
    }

    @GetMapping("/{id}")
    public BranchDto findById(@PathVariable Long id) {
        return branchService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    public ResponseEntity<BranchDto> create(@Valid @RequestBody BranchDto dto) {
        return ResponseEntity.ok(branchService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    public BranchDto update(@PathVariable Long id, @Valid @RequestBody BranchDto dto) {
        return branchService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        branchService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
