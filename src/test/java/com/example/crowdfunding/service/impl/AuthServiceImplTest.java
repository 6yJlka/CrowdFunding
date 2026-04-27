package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.LoginRequest;
import com.example.crowdfunding.api.dto.RegisterRequest;
import com.example.crowdfunding.domain.entity.RoleEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.RoleRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.security.JwtService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthServiceImpl authService;

    @Test
    void registerNormalizesFieldsPersistsUserAndReturnsToken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("  USER@Example.COM ");
        request.setPassword("secret123");
        request.setDisplayName("  Ivan Petrov  ");
        request.setRole("author");

        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.AUTHOR);
        role.setName("Author");

        UUID userId = UUID.randomUUID();
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(roleRepository.findByCode(RoleCode.AUTHOR)).thenReturn(Optional.of(role));
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-password");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity user = invocation.getArgument(0);
            user.setId(userId);
            return user;
        });
        when(jwtService.generate(eq(userId), eq("user@example.com"), eq(java.util.List.of("AUTHOR"))))
                .thenReturn("jwt-token");

        var response = authService.register(request);

        assertThat(response.getAccessToken()).isEqualTo("jwt-token");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        UserEntity saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getDisplayName()).isEqualTo("Ivan Petrov");
        assertThat(saved.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(saved.getRoles()).extracting(RoleEntity::getCode).containsExactly(RoleCode.AUTHOR);
    }

    @Test
    void registerRejectsAdminSelfRegistration() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("admin@example.com");
        request.setPassword("secret123");
        request.setDisplayName("Admin");
        request.setRole("ADMIN");

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("ADMIN cannot be self-registered");
    }

    @Test
    void loginRejectsInactiveUser() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("secret123");

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setPasswordHash("encoded");
        user.setStatus(UserStatus.BLOCKED);
        user.setRoles(Set.of());

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("User is not active");
    }
}
