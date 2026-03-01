package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.AuthResponse;
import com.example.crowdfunding.api.dto.LoginRequest;
import com.example.crowdfunding.api.dto.RegisterRequest;
import com.example.crowdfunding.domain.entity.RoleEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.RoleRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.security.JwtService;
import com.example.crowdfunding.service.AuthService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        RoleCode roleCode;
        try {
            roleCode = RoleCode.valueOf(req.getRole().trim().toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Role must be AUTHOR or SPONSOR");
        }

        if (roleCode == RoleCode.ADMIN) {
            throw new IllegalArgumentException("ADMIN cannot be self-registered");
        }

        RoleEntity role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleCode));

        UserEntity u = new UserEntity();
        u.setEmail(req.getEmail().trim().toLowerCase());
        u.setDisplayName(req.getDisplayName().trim());
        u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        u.setStatus(UserStatus.ACTIVE);
        u.getRoles().add(role);

        UserEntity saved = userRepository.save(u);

        String token = jwtService.generate(saved.getId(), saved.getEmail(), List.of(role.getCode().name()));
        return new AuthResponse(token);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        UserEntity u = userRepository.findByEmail(req.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new IllegalStateException("Invalid credentials"));

        if (u.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("User is not active");
        }

        if (!passwordEncoder.matches(req.getPassword(), u.getPasswordHash())) {
            throw new IllegalStateException("Invalid credentials");
        }

        var roles = u.getRoles().stream().map(r -> r.getCode().name()).toList();
        String token = jwtService.generate(u.getId(), u.getEmail(), roles);
        return new AuthResponse(token);
    }
}