package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.AuthResponse;
import com.example.crowdfunding.api.dto.LoginRequest;
import com.example.crowdfunding.api.dto.RegisterRequest;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public Object me(@AuthenticationPrincipal AppUserDetails user) {
        // минимально
        return new Object() {
            public final String id = user.getId().toString();
            public final String email = user.getUsername();
            public final Object roles = user.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        };
    }
}