package com.vanerp.service;

import com.vanerp.dto.auth.ChangePasswordRequest;
import com.vanerp.dto.auth.LoginRequest;
import com.vanerp.dto.auth.LoginResponse;
import com.vanerp.exception.ApiException;
import com.vanerp.model.User;
import com.vanerp.repository.UserRepository;
import com.vanerp.security.JwtService;
import com.vanerp.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = principal.getUser();
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return buildLoginResponse(principal);
    }

    public LoginResponse refresh(String refreshToken) {
        String username = jwtService.extractUsername(refreshToken);
        if (!jwtService.isTokenValid(refreshToken, username)) {
            throw ApiException.badRequest("رمز التحديث غير صالح أو منتهي الصلاحية");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("المستخدم غير موجود"));
        if (!user.isActive()) {
            throw ApiException.forbidden("الحساب معطل");
        }
        return buildLoginResponse(new UserPrincipal(user));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("المستخدم غير موجود"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("كلمة المرور الحالية غير صحيحة");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private LoginResponse buildLoginResponse(UserPrincipal principal) {
        User user = principal.getUser();
        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        List<String> permissions = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> !a.startsWith("ROLE_"))
                .toList();

        return new LoginResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().getName(),
                user.getBranch() != null ? user.getBranch().getId() : null,
                user.getPreferredLang(),
                permissions
        );
    }
}
