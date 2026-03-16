package com.example.crowdfunding.service;

import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminUserService {
    Page<UserEntity> getUsers(String q, UserStatus status, Pageable pageable);
    UserEntity updateUser(UUID adminId, UUID userId, com.example.crowdfunding.domain.enums.RoleCode role, com.example.crowdfunding.domain.enums.UserStatus status);
}
