package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.AuthResponse;
import ru.donskikh.crowdfunding.api.dto.LoginRequest;
import ru.donskikh.crowdfunding.api.dto.RegisterRequest;
import ru.donskikh.crowdfunding.api.dto.UserProfileResponse;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.AuthService;
import ru.donskikh.crowdfunding.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserProfileService userProfileService;

    public AuthController(AuthService authService, UserProfileService userProfileService) {
        this.authService = authService;
        this.userProfileService = userProfileService;
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
    public UserProfileResponse me(@AuthenticationPrincipal AppUserDetails user) {
        return userProfileService.getCurrentProfile(user.getId());
    }
}
