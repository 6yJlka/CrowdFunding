package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.domain.entity.RoleEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.RoleRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import ru.donskikh.crowdfunding.service.AdminUserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public AdminUserServiceImpl(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserEntity> getUsers(String q, UserStatus status, Pageable pageable) {
        return userRepository.findAllByQuery(q == null ? null : q.trim(), status, pageable);
    }

    @Override
    @Transactional
    public UserEntity updateUser(UUID adminId, UUID userId, RoleCode role, UserStatus status) {
        UserEntity user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        if (adminId.equals(userId)) {
            if (status != UserStatus.ACTIVE) {
                throw new IllegalStateException("Admin cannot block or delete own account");
            }
            if (role != RoleCode.ADMIN) {
                throw new IllegalStateException("Admin cannot remove own admin role");
            }
        }

        RoleEntity targetRole = roleRepository.findByCode(role)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + role));

        user.setStatus(status);
        user.getRoles().clear();
        user.getRoles().add(targetRole);

        return userRepository.save(user);
    }
}
