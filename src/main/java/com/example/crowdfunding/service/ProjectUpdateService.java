package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;

import java.util.List;
import java.util.UUID;

public interface ProjectUpdateService {
    ProjectUpdateEntity create(UUID authorId, UUID projectId, ProjectUpdateCreateRequest req);
    List<ProjectUpdateEntity> listByProject(UUID projectId);
}