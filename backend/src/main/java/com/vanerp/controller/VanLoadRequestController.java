package com.vanerp.controller;

import com.vanerp.dto.*;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.VanLoadRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/van-load-requests")
@RequiredArgsConstructor
public class VanLoadRequestController {

    private final VanLoadRequestService service;

    /** السائق (أو المدير مع vanId) يرسل طلب تحميل. */
    @PostMapping
    public LoadRequestDto create(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody LoadRequestCreateRequest request) {
        return service.create(request, principal.getUser());
    }

    @GetMapping("/my")
    public List<LoadRequestDto> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return service.mine(principal.getUser());
    }

    @GetMapping("/products")
    public List<RequestableProductDto> products() {
        return service.requestableProducts();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public List<LoadRequestDto> list(@RequestParam(required = false) String status) {
        return service.list(status);
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public Map<String, Long> pendingCount() {
        return Map.of("count", service.pendingCount());
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public LoadRequestDto approve(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                  @Valid @RequestBody LoadRequestDecisionRequest request) {
        return service.approve(id, request, principal.getUser());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public LoadRequestDto reject(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                 @RequestBody LoadRequestDecisionRequest request) {
        return service.reject(id, request, principal.getUser());
    }
}
