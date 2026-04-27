package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.UserBioUpdateRequest;
import com.example.crowdfunding.domain.entity.RoleEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserProfileServiceImpl service;

    @Test
    void getCurrentProfileMapsRolesAndAvatarFlag() {
        UUID userId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now();

        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.AUTHOR);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail("user@example.com");
        user.setDisplayName("Alice");
        user.setBio("Bio");
        user.setCreatedAt(createdAt);
        user.setRoles(Set.of(role));
        user.setAvatarContentType("image/png");

        when(userRepository.findWithRolesById(userId)).thenReturn(Optional.of(user));

        var response = service.getCurrentProfile(userId);

        assertThat(response.getId()).isEqualTo(userId);
        assertThat(response.getEmail()).isEqualTo("user@example.com");
        assertThat(response.getDisplayName()).isEqualTo("Alice");
        assertThat(response.getBio()).isEqualTo("Bio");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
        assertThat(response.getRoles()).containsExactly("ROLE_AUTHOR");
        assertThat(response.isHasAvatar()).isTrue();
    }

    @Test
    void getCurrentAvatarThrowsWhenMissing() {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.getCurrentAvatar(userId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Avatar not found");
    }

    @Test
    void updateBioTrimsValueAndReturnsUpdatedProfile() {
        UUID userId = UUID.randomUUID();

        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.SPONSOR);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail("user@example.com");
        user.setDisplayName("Bob");
        user.setCreatedAt(OffsetDateTime.now());
        user.setRoles(Set.of(role));

        UserBioUpdateRequest request = new UserBioUpdateRequest();
        request.setBio("  updated bio  ");

        when(userRepository.findWithRolesById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.updateBio(userId, request);

        assertThat(response.getBio()).isEqualTo("updated bio");
        assertThat(response.getRoles()).containsExactly("ROLE_SPONSOR");
    }

    @Test
    void updateAvatarRejectsNonImage() {
        UUID userId = UUID.randomUUID();
        MultipartFile file = new org.springframework.mock.web.MockMultipartFile("avatar", "avatar.txt", "text/plain", "hello".getBytes());

        assertThatThrownBy(() -> service.updateAvatar(userId, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Avatar must be an image");
    }

    @Test
    void updateAvatarNormalizesToPng() throws Exception {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);

        BufferedImage image = new BufferedImage(80, 60, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 80, 60);
        g.setColor(Color.BLUE);
        g.fillOval(10, 5, 50, 45);
        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);

        MultipartFile file = new org.springframework.mock.web.MockMultipartFile("avatar", "avatar.png", "image/png", out.toByteArray());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateAvatar(userId, file);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        UserEntity saved = captor.getValue();
        assertThat(saved.getAvatarContentType()).isEqualTo("image/png");
        assertThat(saved.getAvatarBytes()).isNotNull().isNotEmpty();

        BufferedImage normalized = ImageIO.read(new java.io.ByteArrayInputStream(saved.getAvatarBytes()));
        assertThat(normalized.getWidth()).isEqualTo(256);
        assertThat(normalized.getHeight()).isEqualTo(256);
    }
}
