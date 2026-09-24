package com.vanerp.controller;

import com.vanerp.dto.DamageCompensationRequest;
import com.vanerp.dto.DamageRequest;
import com.vanerp.dto.DamagedItemDto;
import com.vanerp.dto.StockAdjustRequest;
import com.vanerp.dto.StockItemDto;
import com.vanerp.dto.StockMovementDto;
import com.vanerp.dto.StockTransferRequest;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/warehouse/{warehouseId}")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public List<StockItemDto> byWarehouse(@PathVariable Long warehouseId) {
        return stockService.findByWarehouse(warehouseId);
    }

    @GetMapping("/warehouse/{warehouseId}/page")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public Page<StockItemDto> byWarehousePage(@PathVariable Long warehouseId,
                                               @RequestParam(required = false) String q,
                                               @RequestParam(required = false) Long categoryId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "25") int size) {
        return stockService.findByWarehousePage(warehouseId, q, categoryId, PageRequest.of(page, size));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public List<StockItemDto> byProduct(@PathVariable Long productId) {
        return stockService.findByProduct(productId);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public List<StockItemDto> lowStock() {
        return stockService.findLowStock();
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public Page<StockMovementDto> movements(@RequestParam(required = false) Long productId,
                                             @RequestParam(required = false) Long warehouseId,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return stockService.movements(productId, warehouseId, from.atStartOfDay(), to.plusDays(1).atStartOfDay(), PageRequest.of(page, size));
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAuthority('STOCK_ADJUST')")
    public StockItemDto adjust(@AuthenticationPrincipal UserPrincipal principal,
                                @Valid @RequestBody StockAdjustRequest request) {
        return stockService.adjust(request, principal.getUser());
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAuthority('STOCK_TRANSFER')")
    public ResponseEntity<Void> transfer(@AuthenticationPrincipal UserPrincipal principal,
                                          @Valid @RequestBody StockTransferRequest request) {
        stockService.transfer(request, principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/damaged")
    @PreAuthorize("hasAuthority('STOCK_VIEW')")
    public Page<DamagedItemDto> damaged(@RequestParam(required = false) Long productId,
                                         @RequestParam(required = false) Long warehouseId,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return stockService.damaged(productId, warehouseId, PageRequest.of(page, size));
    }

    @PostMapping("/damaged")
    @PreAuthorize("hasAuthority('STOCK_ADJUST')")
    public ResponseEntity<Void> recordDamage(@AuthenticationPrincipal UserPrincipal principal,
                                              @Valid @RequestBody DamageRequest request) {
        stockService.recordDamage(request, principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/damaged/{id}/compensate")
    @PreAuthorize("hasAuthority('STOCK_ADJUST')")
    public ResponseEntity<Void> compensateDamage(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                                  @Valid @RequestBody DamageCompensationRequest request) {
        stockService.compensateDamage(id, request, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
