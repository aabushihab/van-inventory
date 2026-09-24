package com.ceramicerp.controller;

import com.ceramicerp.dto.auth.ChangePasswordRequest;
import com.ceramicerp.dto.auth.LoginRequest;
import com.ceramicerp.dto.auth.LoginResponse;
import com.ceramicerp.dto.auth.RefreshTokenRequest;
import com.ceramicerp.security.UserPrincipal;
import com.ceramicerp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal UserPrincipal principal) {
        var user = principal.getUser();
        return ResponseEntity.ok(new java.util.HashMap<String, Object>() {{
            put("id", user.getId());
            put("username", user.getUsername());
            put("fullName", user.getFullName());
            put("email", user.getEmail());
            put("role", user.getRole().getName());
            put("branchId", user.getBranch() != null ? user.getBranch().getId() : null);
            put("preferredLang", user.getPreferredLang());
            put("permissions", principal.getAuthorities().stream()
                    .map(Object::toString)
                    .filter(a -> !a.startsWith("ROLE_"))
                    .toList());
        }});
    }
}
