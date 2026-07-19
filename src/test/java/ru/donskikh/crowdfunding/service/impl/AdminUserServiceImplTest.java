package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.RoleRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private AdminUserServiceImpl service;

    @Test
    void getUsersTrimsQuery() {
        var pageable = PageRequest.of(0, 10);
        when(userRepository.findAllByQuery("alice", UserStatus.ACTIVE, pageable)).thenReturn(new PageImpl<>(java.util.List.of()));

        service.getUsers(" alice ", UserStatus.ACTIVE, pageable);

        verify(userRepository).findAllByQuery("alice", UserStatus.ACTIVE, pageable);
    }

    @Test
    void updateUserPreventsSelfBlocking() {
        UUID adminId = UUID.randomUUID();
        UserEntity admin = new UserEntity();
        admin.setId(adminId);

        when(userRepository.findWithRolesById(adminId)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.updateUser(adminId, adminId, RoleCode.ADMIN, UserStatus.BLOCKED))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Admin cannot block or delete own account");
    }

    @Test
    void updateUserPreventsSelfRoleRemoval() {
        UUID adminId = UUID.randomUUID();
        UserEntity admin = new UserEntity();
        admin.setId(adminId);

        when(userRepository.findWithRolesById(adminId)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.updateUser(adminId, adminId, RoleCode.AUTHOR, UserStatus.ACTIVE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Admin cannot remove own admin role");
    }

    @Test
    void updateUserThrowsWhenRoleMissing() {
        UUID adminId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);

        when(userRepository.findWithRolesById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findByCode(RoleCode.SPONSOR)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateUser(adminId, userId, RoleCode.SPONSOR, UserStatus.ACTIVE))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Role not found: SPONSOR");
    }

    @Test
    void updateUserReplacesRoleAndStatus() {
        UUID adminId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        RoleEntity oldRole = new RoleEntity();
        oldRole.setCode(RoleCode.AUTHOR);
        RoleEntity newRole = new RoleEntity();
        newRole.setCode(RoleCode.SPONSOR);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setRoles(new java.util.HashSet<>(Set.of(oldRole)));
        user.setStatus(UserStatus.ACTIVE);

        when(userRepository.findWithRolesById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findByCode(RoleCode.SPONSOR)).thenReturn(Optional.of(newRole));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserEntity updated = service.updateUser(adminId, userId, RoleCode.SPONSOR, UserStatus.DELETED);

        assertThat(updated.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(updated.getRoles()).extracting(RoleEntity::getCode).containsExactly(RoleCode.SPONSOR);
    }
}
