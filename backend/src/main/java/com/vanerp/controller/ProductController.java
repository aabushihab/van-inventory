package com.vanerp.controller;

import com.vanerp.dto.ProductDto;
import com.vanerp.dto.ProductUpsertRequest;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.ProductService;
import com.vanerp.service.VanAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final VanAccessService vanAccessService;

    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCT_VIEW')")
    public Page<ProductDto> search(@AuthenticationPrincipal UserPrincipal principal,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(required = false) Long categoryId,
                                    @RequestParam(defaultValue = "true") boolean activeOnly,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        // المندوب يرى فقط الأصناف المحمّلة حالياً على سيارته
        Long vanWarehouseId = vanAccessService.restrictedWarehouseId(principal.getUser());
        if (vanWarehouseId != null) {
            return productService.searchInWarehouse(q, categoryId, vanWarehouseId, PageRequest.of(page, size, Sort.by("name")));
        }
        return productService.search(q, categoryId, activeOnly, PageRequest.of(page, size, Sort.by("name")));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_VIEW')")
    public ProductDto findById(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        Long vanWarehouseId = vanAccessService.restrictedWarehouseId(principal.getUser());
        if (vanWarehouseId != null) return productService.findInWarehouse(id, vanWarehouseId);
        return productService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<ProductDto> create(@Valid @RequestBody ProductUpsertRequest request) {
        return ResponseEntity.ok(productService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductUpsertRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
