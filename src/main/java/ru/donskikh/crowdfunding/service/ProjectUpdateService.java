package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import ru.donskikh.crowdfunding.domain.entity.ProjectUpdateEntity;

import java.util.List;
import java.util.UUID;

public interface ProjectUpdateService {
    ProjectUpdateEntity create(UUID authorId, UUID projectId, ProjectUpdateCreateRequest req);
    List<ProjectUpdateEntity> listByProject(UUID projectId);
}