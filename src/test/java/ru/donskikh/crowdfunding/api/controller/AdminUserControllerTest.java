package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.AdminUserUpdateRequest;
import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.AdminUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminUserController controller;

    @Test
    void usersMapsRoleAndStatus() {
        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.AUTHOR);

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setDisplayName("Alice");
        user.setRoles(Set.of(role));
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(OffsetDateTime.now());

        when(adminUserService.getUsers("alice", UserStatus.ACTIVE, PageRequest.of(0, 5))).thenReturn(new PageImpl<>(List.of(user)));

        var page = controller.users("alice", UserStatus.ACTIVE, PageRequest.of(0, 5));

        assertThat(page.getContent()).singleElement().satisfies(item -> {
            assertThat(item.getEmail()).isEqualTo("user@example.com");
            assertThat(item.getRole()).isEqualTo(RoleCode.AUTHOR);
            assertThat(item.getStatus()).isEqualTo(UserStatus.ACTIVE);
        });
    }

    @Test
    void updateUserDelegatesAndMapsResponse() {
        UUID adminId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AppUserDetails admin = new AppUserDetails(adminId, "admin@example.com", "hash", List.of());

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setRole(RoleCode.SPONSOR);
        request.setStatus(UserStatus.BLOCKED);

        RoleEntity role = new RoleEntity();
        role.setCode(RoleCode.SPONSOR);

        UserEntity updated = new UserEntity();
        updated.setId(userId);
        updated.setEmail("user@example.com");
        updated.setDisplayName("Bob");
        updated.setRoles(Set.of(role));
        updated.setStatus(UserStatus.BLOCKED);
        updated.setCreatedAt(OffsetDateTime.now());

        when(adminUserService.updateUser(adminId, userId, RoleCode.SPONSOR, UserStatus.BLOCKED)).thenReturn(updated);

        var response = controller.updateUser(admin, userId, request);

        assertThat(response.getId()).isEqualTo(userId);
        assertThat(response.getRole()).isEqualTo(RoleCode.SPONSOR);
        assertThat(response.getStatus()).isEqualTo(UserStatus.BLOCKED);
    }
}
