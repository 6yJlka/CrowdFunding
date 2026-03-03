package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.ProjectReviewRequest;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;

import java.util.List;
import java.util.UUID;

public interface ProjectReviewService {
    ProjectReviewEntity create(UUID userId, UUID projectId, ProjectReviewRequest req);
    List<ProjectReviewEntity> getAllByProject(UUID projectId);
}
