package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.ProjectCreateRequest;
import ru.donskikh.crowdfunding.api.dto.ProjectImageResponse;
import ru.donskikh.crowdfunding.api.dto.ProjectUpdateRequest;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ProjectService {

    ProjectEntity create(UUID authorId, ProjectCreateRequest req);

    ProjectEntity update(UUID authorId, UUID projectId, ProjectUpdateRequest req);

    void updateCoverImage(UUID authorId, UUID projectId, MultipartFile file);

    ProjectImageResponse getCoverImage(UUID projectId);

    ProjectEntity submitToModeration(UUID authorId, UUID projectId);

    ProjectEntity getById(UUID projectId);

    Page<ProjectEntity> getCatalog(String q, Pageable pageable);

    Page<ProjectEntity> getCatalog(String q, Long categoryId, ru.donskikh.crowdfunding.domain.enums.ProjectStatus status, Pageable pageable);

    Page<ProjectEntity> getCatalog(String q, Long categoryId, UUID authorId, ru.donskikh.crowdfunding.domain.enums.ProjectStatus status, Pageable pageable);

    Page<ProjectEntity> getCatalog(String q,
                                   Long categoryId,
                                   boolean uncategorized,
                                   UUID authorId,
                                   ru.donskikh.crowdfunding.domain.enums.ProjectStatus status,
                                   Pageable pageable);

    Page<ProjectEntity> getAuthorProjects(UUID authorId, Pageable pageable);

    Page<ProjectEntity> getProjectsByStatus(ru.donskikh.crowdfunding.domain.enums.ProjectStatus status, Pageable pageable);

    ProjectEntity approve(UUID projectId);

    ProjectEntity reject(UUID projectId, String reason);
}
