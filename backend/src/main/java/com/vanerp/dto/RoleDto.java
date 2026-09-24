package com.vanerp.dto;

import java.util.List;

public record RoleDto(Long id, String name, String nameAr, String description, boolean system, List<PermissionDto> permissions) {}
