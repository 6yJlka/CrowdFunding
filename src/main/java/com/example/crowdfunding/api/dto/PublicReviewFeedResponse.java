package com.example.crowdfunding.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class PublicReviewFeedResponse {

    private UUID reviewId;
    private UUID projectId;
    private String projectTitle;
    private String userDisplayName;
    private Short rating;
    private String reviewText;
    private OffsetDateTime createdAt;

    public PublicReviewFeedResponse(UUID reviewId,
                                    UUID projectId,
                                    String projectTitle,
                                    String userDisplayName,
                                    Short rating,
                                    String reviewText,
                                    OffsetDateTime createdAt) {
        this.reviewId = reviewId;
        this.projectId = projectId;
        this.projectTitle = projectTitle;
        this.userDisplayName = userDisplayName;
        this.rating = rating;
        this.reviewText = reviewText;
        this.createdAt = createdAt;
    }

    public UUID getReviewId() {
        return reviewId;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public String getProjectTitle() {
        return projectTitle;
    }

    public String getUserDisplayName() {
        return userDisplayName;
    }

    public Short getRating() {
        return rating;
    }

    public String getReviewText() {
        return reviewText;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
