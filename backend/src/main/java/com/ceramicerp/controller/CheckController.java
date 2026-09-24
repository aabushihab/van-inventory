package com.ceramicerp.controller;

import com.ceramicerp.dto.CheckDto;
import com.ceramicerp.dto.CheckRequest;
import com.ceramicerp.dto.CheckStatusUpdateRequest;
import com.ceramicerp.model.CheckStatus;
import com.ceramicerp.security.UserPrincipal;
import com.ceramicerp.service.CheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checks")
@RequiredArgsConstructor
public class CheckController {

    private final CheckService checkService;

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('CHECKS_VIEW')")
    public Page<CheckDto> search(@RequestParam(required = false) CheckStatus status,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "25") int size) {
        return checkService.search(status, PageRequest.of(page, size));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CHECKS_MANAGE')")
    public ResponseEntity<CheckDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody CheckRequest request) {
        return ResponseEntity.ok(checkService.create(request, principal.getUser()));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('CHECKS_MANAGE')")
    public CheckDto updateStatus(@AuthenticationPrincipal UserPrincipal principal,
                                  @PathVariable Long id, @Valid @RequestBody CheckStatusUpdateRequest request) {
        return checkService.updateStatus(id, request, principal.getUser());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CHECKS_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        checkService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
