package com.ceramicerp.service;

import com.ceramicerp.dto.PermissionDto;
import com.ceramicerp.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;

    public List<PermissionDto> findAll() {
        return permissionRepository.findAll().stream()
                .map(p -> new PermissionDto(p.getId(), p.getCode(), p.getDescription()))
                .toList();
    }
}
