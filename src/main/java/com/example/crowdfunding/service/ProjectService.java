package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.ProjectCreateRequest;
import com.example.crowdfunding.api.dto.ProjectUpdateRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ProjectService {

    ProjectEntity create(UUID authorId, ProjectCreateRequest req);

    ProjectEntity update(UUID authorId, UUID projectId, ProjectUpdateRequest req);

    ProjectEntity submitToModeration(UUID authorId, UUID projectId);

    ProjectEntity getById(UUID projectId);

    Page<ProjectEntity> getCatalog(String q, Pageable pageable);

    ProjectEntity approve(UUID projectId);

    ProjectEntity reject(UUID projectId, String reason);
}