package ru.donskikh.crowdfunding.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class DashboardSponsorResponse {

    private UUID sponsorId;
    private String sponsorDisplayName;
    private OffsetDateTime supportedAt;
    private boolean hasAvatar;

    public UUID getSponsorId() {
        return sponsorId;
    }

    public void setSponsorId(UUID sponsorId) {
        this.sponsorId = sponsorId;
    }

    public String getSponsorDisplayName() {
        return sponsorDisplayName;
    }

    public void setSponsorDisplayName(String sponsorDisplayName) {
        this.sponsorDisplayName = sponsorDisplayName;
    }

    public OffsetDateTime getSupportedAt() {
        return supportedAt;
    }

    public void setSupportedAt(OffsetDateTime supportedAt) {
        this.supportedAt = supportedAt;
    }

    public boolean isHasAvatar() {
        return hasAvatar;
    }

    public void setHasAvatar(boolean hasAvatar) {
        this.hasAvatar = hasAvatar;
    }
}
