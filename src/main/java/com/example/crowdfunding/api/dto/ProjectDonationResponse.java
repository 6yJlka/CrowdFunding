package com.example.crowdfunding.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ProjectDonationResponse {
    private UUID id;

    private UUID sponsorId;
    private String sponsorDisplayName;

    private BigDecimal amount;
    private String status;

    private OffsetDateTime createdAt;
    private OffsetDateTime confirmedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getSponsorId() { return sponsorId; }
    public void setSponsorId(UUID sponsorId) { this.sponsorId = sponsorId; }

    public String getSponsorDisplayName() { return sponsorDisplayName; }
    public void setSponsorDisplayName(String sponsorDisplayName) { this.sponsorDisplayName = sponsorDisplayName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(OffsetDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
}