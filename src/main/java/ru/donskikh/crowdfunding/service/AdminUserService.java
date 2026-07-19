package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminUserService {
    Page<UserEntity> getUsers(String q, UserStatus status, Pageable pageable);
    UserEntity updateUser(UUID adminId, UUID userId, ru.donskikh.crowdfunding.domain.enums.RoleCode role, ru.donskikh.crowdfunding.domain.enums.UserStatus status);
}
