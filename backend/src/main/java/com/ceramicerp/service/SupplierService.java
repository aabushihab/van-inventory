package com.ceramicerp.service;

import com.ceramicerp.dto.PartyDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Supplier;
import com.ceramicerp.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<PartyDto> findAll(String q) {
        return supplierRepository.search(q).stream().map(this::toDto).toList();
    }

    public Page<PartyDto> findAllPage(String q, Pageable pageable) {
        return supplierRepository.searchPage(q, pageable).map(this::toDto);
    }

    @Transactional
    public PartyDto create(PartyDto dto) {
        Supplier s = Supplier.builder().name(dto.name()).phone(dto.phone()).email(dto.email())
                .address(dto.address()).taxNumber(dto.taxNumber()).active(true).build();
        return toDto(supplierRepository.save(s));
    }

    @Transactional
    public PartyDto update(Long id, PartyDto dto) {
        Supplier s = supplierRepository.findById(id).orElseThrow(() -> ApiException.notFound("المورد غير موجود"));
        s.setName(dto.name()); s.setPhone(dto.phone()); s.setEmail(dto.email());
        s.setAddress(dto.address()); s.setTaxNumber(dto.taxNumber()); s.setActive(dto.active());
        return toDto(supplierRepository.save(s));
    }

    @Transactional
    public void delete(Long id) {
        supplierRepository.deleteById(id);
    }

    private PartyDto toDto(Supplier s) {
        return new PartyDto(s.getId(), s.getName(), s.getPhone(), s.getEmail(), s.getAddress(), s.getTaxNumber(), s.isActive());
    }
}
