package com.vanerp.service;

import com.vanerp.dto.UnitDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Unit;
import com.vanerp.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;

    public List<UnitDto> findAll() {
        return unitRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public UnitDto create(UnitDto dto) {
        Unit unit = Unit.builder().code(dto.code()).name(dto.name()).nameEn(dto.nameEn()).build();
        return toDto(unitRepository.save(unit));
    }

    @Transactional
    public UnitDto update(Long id, UnitDto dto) {
        Unit unit = unitRepository.findById(id).orElseThrow(() -> ApiException.notFound("وحدة القياس غير موجودة"));
        unit.setCode(dto.code());
        unit.setName(dto.name());
        unit.setNameEn(dto.nameEn());
        return toDto(unitRepository.save(unit));
    }

    @Transactional
    public void delete(Long id) {
        unitRepository.deleteById(id);
    }

    private UnitDto toDto(Unit u) {
        return new UnitDto(u.getId(), u.getCode(), u.getName(), u.getNameEn());
    }
}
