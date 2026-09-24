package com.ceramicerp.controller;

import com.ceramicerp.dto.PartyDto;
import com.ceramicerp.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('SUPPLIER_MANAGE')")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public List<PartyDto> findAll(@RequestParam(required = false) String q) {
        return supplierService.findAll(q);
    }

    @GetMapping("/page")
    public Page<PartyDto> findAllPage(@RequestParam(required = false) String q,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "25") int size) {
        return supplierService.findAllPage(q, PageRequest.of(page, size));
    }

    @PostMapping
    public ResponseEntity<PartyDto> create(@Valid @RequestBody PartyDto dto) {
        return ResponseEntity.ok(supplierService.create(dto));
    }

    @PutMapping("/{id}")
    public PartyDto update(@PathVariable Long id, @Valid @RequestBody PartyDto dto) {
        return supplierService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
