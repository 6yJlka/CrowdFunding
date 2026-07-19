package ru.donskikh.crowdfunding.api.dto;

import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public class AdminUserUpdateRequest {

    @NotNull
    private RoleCode role;

    @NotNull
    private UserStatus status;

    public RoleCode getRole() { return role; }
    public void setRole(RoleCode role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
}
