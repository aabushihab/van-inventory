package com.vanerp.controller;

import com.vanerp.dto.PartyDto;
import com.vanerp.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('CUSTOMER_MANAGE')")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public List<PartyDto> findAll(@RequestParam(required = false) String q) {
        return customerService.findAll(q);
    }

    /** نسخة مقسّمة على صفحات لشاشة إدارة العملاء (تدعم أعداداً كبيرة من العملاء). */
    @GetMapping("/page")
    public Page<PartyDto> findAllPage(@RequestParam(required = false) String q,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "25") int size) {
        return customerService.findAllPage(q, PageRequest.of(page, size));
    }

    @PostMapping
    public ResponseEntity<PartyDto> create(@Valid @RequestBody PartyDto dto) {
        return ResponseEntity.ok(customerService.create(dto));
    }

    @PutMapping("/{id}")
    public PartyDto update(@PathVariable Long id, @Valid @RequestBody PartyDto dto) {
        return customerService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
