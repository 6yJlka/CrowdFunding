package com.example.crowdfunding.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class DonationCreateRequest {

    @NotNull
    private UUID projectId;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    // getters/setters
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}