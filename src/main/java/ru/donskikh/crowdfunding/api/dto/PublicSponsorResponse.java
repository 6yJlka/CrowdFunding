package ru.donskikh.crowdfunding.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class PublicSponsorResponse {

    private UUID sponsorId;
    private String sponsorDisplayName;
    private long supportedProjects;
    private BigDecimal totalAmount;
    private OffsetDateTime lastSupportedAt;
    private boolean hasAvatar;

    public PublicSponsorResponse(UUID sponsorId,
                                 String sponsorDisplayName,
                                 long supportedProjects,
                                 BigDecimal totalAmount,
                                 OffsetDateTime lastSupportedAt,
                                 boolean hasAvatar) {
        this.sponsorId = sponsorId;
        this.sponsorDisplayName = sponsorDisplayName;
        this.supportedProjects = supportedProjects;
        this.totalAmount = totalAmount;
        this.lastSupportedAt = lastSupportedAt;
        this.hasAvatar = hasAvatar;
    }

    public UUID getSponsorId() {
        return sponsorId;
    }

    public String getSponsorDisplayName() {
        return sponsorDisplayName;
    }

    public long getSupportedProjects() {
        return supportedProjects;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public OffsetDateTime getLastSupportedAt() {
        return lastSupportedAt;
    }

    public boolean isHasAvatar() {
        return hasAvatar;
    }
}
