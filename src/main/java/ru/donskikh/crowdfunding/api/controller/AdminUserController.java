package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.AdminUserResponse;
import ru.donskikh.crowdfunding.api.dto.AdminUserUpdateRequest;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public Page<AdminUserResponse> users(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) UserStatus status,
            Pageable pageable
    ) {
        return adminUserService.getUsers(q, status, pageable).map(this::toResponse);
    }

    @PutMapping("/{id}")
    public AdminUserResponse updateUser(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID id,
            @Valid @RequestBody AdminUserUpdateRequest request
    ) {
        return toResponse(adminUserService.updateUser(user.getId(), id, request.getRole(), request.getStatus()));
    }

    private AdminUserResponse toResponse(ru.donskikh.crowdfunding.domain.entity.UserEntity user) {
        AdminUserResponse response = new AdminUserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRoles().stream().findFirst().map(ru.donskikh.crowdfunding.domain.entity.RoleEntity::getCode).orElse(null));
        response.setStatus(user.getStatus());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }
}
