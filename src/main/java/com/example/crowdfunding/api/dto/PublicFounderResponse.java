package com.example.crowdfunding.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class PublicFounderResponse {

    private UUID authorId;
    private String authorDisplayName;
    private long projectsCount;
    private BigDecimal totalRaised;
    private OffsetDateTime latestProjectCreatedAt;

    public PublicFounderResponse(UUID authorId,
                                 String authorDisplayName,
                                 long projectsCount,
                                 BigDecimal totalRaised,
                                 OffsetDateTime latestProjectCreatedAt) {
        this.authorId = authorId;
        this.authorDisplayName = authorDisplayName;
        this.projectsCount = projectsCount;
        this.totalRaised = totalRaised;
        this.latestProjectCreatedAt = latestProjectCreatedAt;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public long getProjectsCount() {
        return projectsCount;
    }

    public BigDecimal getTotalRaised() {
        return totalRaised;
    }

    public OffsetDateTime getLatestProjectCreatedAt() {
        return latestProjectCreatedAt;
    }

    public String getAuthorDisplayName() {
        return authorDisplayName;
    }
}
