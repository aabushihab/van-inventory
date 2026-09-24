package com.vanerp.controller;

import com.vanerp.dto.StocktakeCountUpdateRequest;
import com.vanerp.dto.StocktakeCreateRequest;
import com.vanerp.dto.StocktakeSessionDto;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.StocktakeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocktake")
@RequiredArgsConstructor
public class StocktakeController {

    private final StocktakeService stocktakeService;

    @GetMapping
    @PreAuthorize("hasAuthority('STOCKTAKE_VIEW')")
    public List<StocktakeSessionDto> findAll() {
        return stocktakeService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('STOCKTAKE_VIEW')")
    public StocktakeSessionDto findById(@PathVariable Long id) {
        return stocktakeService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('STOCKTAKE_MANAGE')")
    public ResponseEntity<StocktakeSessionDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                        @Valid @RequestBody StocktakeCreateRequest request) {
        return ResponseEntity.ok(stocktakeService.create(request, principal.getUser()));
    }

    @PutMapping("/{id}/counts")
    @PreAuthorize("hasAuthority('STOCKTAKE_MANAGE')")
    public StocktakeSessionDto updateCounts(@PathVariable Long id, @Valid @RequestBody StocktakeCountUpdateRequest request) {
        return stocktakeService.updateCounts(id, request);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('STOCKTAKE_MANAGE')")
    public StocktakeSessionDto complete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return stocktakeService.complete(id, principal.getUser());
    }
}
