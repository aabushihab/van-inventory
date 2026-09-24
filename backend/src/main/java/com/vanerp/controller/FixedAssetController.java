package com.vanerp.controller;

import com.vanerp.dto.FixedAssetDisposeRequest;
import com.vanerp.dto.FixedAssetDto;
import com.vanerp.dto.FixedAssetRequest;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.FixedAssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fixed-assets")
@RequiredArgsConstructor
public class FixedAssetController {

    private final FixedAssetService fixedAssetService;

    @GetMapping
    @PreAuthorize("hasAuthority('FIXED_ASSETS_VIEW')")
    public List<FixedAssetDto> findAll() {
        return fixedAssetService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FIXED_ASSETS_VIEW')")
    public FixedAssetDto findById(@PathVariable Long id) {
        return fixedAssetService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('FIXED_ASSETS_MANAGE')")
    public ResponseEntity<FixedAssetDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                 @Valid @RequestBody FixedAssetRequest request) {
        return ResponseEntity.ok(fixedAssetService.create(request, principal.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('FIXED_ASSETS_MANAGE')")
    public FixedAssetDto update(@AuthenticationPrincipal UserPrincipal principal,
                                 @PathVariable Long id, @Valid @RequestBody FixedAssetRequest request) {
        return fixedAssetService.update(id, request, principal.getUser());
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAuthority('FIXED_ASSETS_MANAGE')")
    public FixedAssetDto dispose(@AuthenticationPrincipal UserPrincipal principal,
                                  @PathVariable Long id, @Valid @RequestBody FixedAssetDisposeRequest request) {
        return fixedAssetService.dispose(id, request, principal.getUser());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FIXED_ASSETS_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        fixedAssetService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
