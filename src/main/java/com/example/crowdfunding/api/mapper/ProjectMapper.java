package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.api.dto.ProjectResponse;
import com.example.crowdfunding.domain.entity.ProjectEntity;

public final class ProjectMapper {

    private ProjectMapper() {}

    public static ProjectResponse toResponse(ProjectEntity p) {
        ProjectResponse dto = new ProjectResponse();
        dto.setId(p.getId());

        dto.setTitle(p.getTitle());
        dto.setShortDescription(p.getShortDescription());
        dto.setDescription(p.getDescription());

        dto.setGoalAmount(p.getGoalAmount());
        dto.setCollectedAmount(p.getCollectedAmount());
        dto.setCurrency(p.getCurrency());

        dto.setStatus(p.getStatus());
        dto.setStartAt(p.getStartAt());
        dto.setEndAt(p.getEndAt());

        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        if (p.getAuthor() != null) {
            dto.setAuthorId(p.getAuthor().getId());
            dto.setAuthorDisplayName(p.getAuthor().getDisplayName());
        }

        if (p.getCategory() != null) {
            dto.setCategoryId(p.getCategory().getId());
            dto.setCategoryTitle(p.getCategory().getTitle());
        }

        return dto;
    }
}