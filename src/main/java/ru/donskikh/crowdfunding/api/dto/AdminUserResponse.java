package ru.donskikh.crowdfunding.api.dto;

import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public class AdminUserResponse {

    private UUID id;
    private String email;
    private String displayName;
    private RoleCode role;
    private UserStatus status;
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public RoleCode getRole() { return role; }
    public void setRole(RoleCode role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
