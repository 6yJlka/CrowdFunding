package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.api.dto.ProjectReviewResponse;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;

public class ProjectReviewMapper {

    public static ProjectReviewResponse toResponse(ProjectReviewEntity review) {
        ProjectReviewResponse response = new ProjectReviewResponse();
        response.setId(review.getId());
        response.setProjectId(review.getProject().getId());
        response.setUserId(review.getUser().getId());
        response.setUserDisplayName(review.getUser().getDisplayName());
        response.setRating(review.getRating());
        response.setReviewText(review.getReviewText());
        response.setCreatedAt(review.getCreatedAt());
        return response;
    }
}