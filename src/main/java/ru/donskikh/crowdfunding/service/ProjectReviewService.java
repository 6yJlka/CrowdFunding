package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.ProjectReviewRequest;
import ru.donskikh.crowdfunding.domain.entity.ProjectReviewEntity;

import java.util.List;
import java.util.UUID;

public interface ProjectReviewService {
    ProjectReviewEntity create(UUID userId, UUID projectId, ProjectReviewRequest req);
    List<ProjectReviewEntity> getAllByProject(UUID projectId);
}
