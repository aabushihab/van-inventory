package com.vanerp.service;

import com.vanerp.dto.PermissionDto;
import com.vanerp.dto.RoleDto;
import com.vanerp.dto.RoleUpsertRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Permission;
import com.vanerp.model.Role;
import com.vanerp.repository.PermissionRepository;
import com.vanerp.repository.RoleRepository;
import com.vanerp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    public List<RoleDto> findAll() {
        return roleRepository.findAll().stream().map(this::toDto).toList();
    }

    public RoleDto findById(Long id) {
        return toDto(getRoleOrThrow(id));
    }

    @Transactional
    public RoleDto create(RoleUpsertRequest request) {
        if (roleRepository.existsByName(request.name())) {
            throw ApiException.conflict("يوجد دور بنفس الاسم مسبقاً");
        }
        Role role = Role.builder()
                .name(request.name())
                .nameAr(request.nameAr())
                .description(request.description())
                .system(false)
                .permissions(resolvePermissions(request.permissionIds()))
                .build();
        return toDto(roleRepository.save(role));
    }

    @Transactional
    public RoleDto update(Long id, RoleUpsertRequest request) {
        Role role = getRoleOrThrow(id);
        if (role.isSystem()) {
            // الأدوار الأساسية: يمكن تعديل الصلاحيات فقط، لا الاسم
            role.setPermissions(resolvePermissions(request.permissionIds()));
        } else {
            role.setName(request.name());
            role.setNameAr(request.nameAr());
            role.setDescription(request.description());
            role.setPermissions(resolvePermissions(request.permissionIds()));
        }
        return toDto(roleRepository.save(role));
    }

    @Transactional
    public void delete(Long id) {
        Role role = getRoleOrThrow(id);
        if (role.isSystem()) {
            throw ApiException.badRequest("لا يمكن حذف الأدوار الأساسية للنظام");
        }
        boolean inUse = userRepository.findAll().stream().anyMatch(u -> u.getRole().getId().equals(id));
        if (inUse) {
            throw ApiException.conflict("لا يمكن حذف الدور لوجود مستخدمين مرتبطين به");
        }
        roleRepository.delete(role);
    }

    private Set<Permission> resolvePermissions(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        return new HashSet<>(permissionRepository.findAllById(ids));
    }

    private Role getRoleOrThrow(Long id) {
        return roleRepository.findById(id).orElseThrow(() -> ApiException.notFound("الدور غير موجود"));
    }

    private RoleDto toDto(Role role) {
        List<PermissionDto> perms = role.getPermissions().stream()
                .map(p -> new PermissionDto(p.getId(), p.getCode(), p.getDescription()))
                .toList();
        return new RoleDto(role.getId(), role.getName(), role.getNameAr(), role.getDescription(), role.isSystem(), perms);
    }
}
