package com.ceramicerp.controller;

import com.ceramicerp.dto.RoleDto;
import com.ceramicerp.dto.RoleUpsertRequest;
import com.ceramicerp.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_MANAGE')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public List<RoleDto> findAll() {
        return roleService.findAll();
    }

    @GetMapping("/{id}")
    public RoleDto findById(@PathVariable Long id) {
        return roleService.findById(id);
    }

    @PostMapping
    public ResponseEntity<RoleDto> create(@Valid @RequestBody RoleUpsertRequest request) {
        return ResponseEntity.ok(roleService.create(request));
    }

    @PutMapping("/{id}")
    public RoleDto update(@PathVariable Long id, @Valid @RequestBody RoleUpsertRequest request) {
        return roleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
