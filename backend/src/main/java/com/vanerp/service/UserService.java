package com.vanerp.service;

import com.vanerp.dto.UserCreateRequest;
import com.vanerp.dto.UserDto;
import com.vanerp.dto.UserUpdateRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Branch;
import com.vanerp.model.Role;
import com.vanerp.model.User;
import com.vanerp.repository.BranchRepository;
import com.vanerp.repository.RoleRepository;
import com.vanerp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserDto> findAllPage(String q, Pageable pageable) {
        return userRepository.search(q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public UserDto findById(Long id) {
        return toDto(getUserOrThrow(id));
    }

    @Transactional
    public UserDto create(UserCreateRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw ApiException.conflict("اسم المستخدم مستخدم مسبقاً");
        }
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> ApiException.notFound("الدور غير موجود"));
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;

        User user = User.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .email(request.email())
                .phone(request.phone())
                .role(role)
                .branch(branch)
                .preferredLang(request.preferredLang() != null ? request.preferredLang() : "ar")
                .active(true)
                .build();

        return toDto(userRepository.save(user));
    }

    @Transactional
    public UserDto update(Long id, UserUpdateRequest request) {
        User user = getUserOrThrow(id);
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> ApiException.notFound("الدور غير موجود"));
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;

        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole(role);
        user.setBranch(branch);
        if (request.preferredLang() != null) user.setPreferredLang(request.preferredLang());
        user.setActive(request.active());
        user.setUpdatedAt(LocalDateTime.now());

        return toDto(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = getUserOrThrow(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = getUserOrThrow(id);
        if ("admin".equals(user.getUsername())) {
            throw ApiException.badRequest("لا يمكن حذف مستخدم المدير الافتراضي");
        }
        userRepository.delete(user);
    }

    private User getUserOrThrow(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("المستخدم غير موجود"));
    }

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(), u.getUsername(), u.getFullName(), u.getEmail(), u.getPhone(),
                u.getRole().getId(), u.getRole().getName(),
                u.getBranch() != null ? u.getBranch().getId() : null,
                u.getBranch() != null ? u.getBranch().getName() : null,
                u.getPreferredLang(), u.isActive(), u.getLastLoginAt()
        );
    }
}
