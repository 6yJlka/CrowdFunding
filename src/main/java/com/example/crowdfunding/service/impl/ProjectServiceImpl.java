package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectCreateRequest;
import com.example.crowdfunding.api.dto.ProjectUpdateRequest;
import com.example.crowdfunding.domain.entity.CategoryEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.repository.CategoryRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.service.ProjectService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    public ProjectServiceImpl(ProjectRepository projectRepository,
                              UserRepository userRepository,
                              CategoryRepository categoryRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public ProjectEntity create(UUID authorId, ProjectCreateRequest req) {
        UserEntity author = userRepository.findById(authorId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + authorId));

        ProjectEntity project = new ProjectEntity();
        project.setAuthor(author);

        applyCreateOrUpdate(
                project,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );

        project.setStatus(ProjectStatus.DRAFT);
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity update(UUID authorId, UUID projectId, ProjectUpdateRequest req) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can update this project");
        }

        if (project.getStatus() != ProjectStatus.DRAFT && project.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be edited only in DRAFT or REJECTED");
        }

        applyCreateOrUpdate(
                project,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity submitToModeration(UUID authorId, UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can submit this project");
        }

        if (project.getStatus() != ProjectStatus.DRAFT && project.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be submitted only from DRAFT or REJECTED");
        }

        project.setStatus(ProjectStatus.MODERATION);
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectEntity getById(UUID projectId) {
        return loadForResponse(projectId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Pageable pageable) {
        if (q == null || q.isBlank()) {
            return projectRepository.findByStatus(ProjectStatus.ACTIVE, pageable);
        }
        return projectRepository.findByStatusAndTitleStartingWithIgnoreCase(ProjectStatus.ACTIVE, q.trim(), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Long categoryId, ProjectStatus status, Pageable pageable) {
        ProjectStatus publicStatus = status == ProjectStatus.FUNDED ? ProjectStatus.FUNDED : ProjectStatus.ACTIVE;
        return projectRepository.findPublicCatalog(List.of(publicStatus), q == null ? null : q.trim(), categoryId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getAuthorProjects(UUID authorId, Pageable pageable) {
        return projectRepository.findByAuthorIdOrderByCreatedAtDesc(authorId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getProjectsByStatus(ProjectStatus status, Pageable pageable) {
        return projectRepository.findByStatus(status, pageable);
    }

    private ProjectEntity loadForResponse(UUID projectId) {
        return projectRepository.findWithAuthorAndCategoryById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
    }

    private void applyCreateOrUpdate(ProjectEntity project,
                                     Long categoryId,
                                     String title,
                                     String shortDescription,
                                     String description,
                                     java.math.BigDecimal goalAmount,
                                     String currency,
                                     java.time.OffsetDateTime startAt,
                                     java.time.OffsetDateTime endAt) {

        project.setTitle(title);
        project.setShortDescription(shortDescription);
        project.setDescription(description);
        project.setGoalAmount(goalAmount);
        project.setCurrency(currency);
        project.setStartAt(startAt);
        project.setEndAt(endAt);

        if (categoryId == null) {
            project.setCategory(null);
        } else {
            CategoryEntity category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new EntityNotFoundException("Category not found: " + categoryId));
            project.setCategory(category);
        }

        if (project.getStartAt() != null && project.getEndAt() != null && !project.getEndAt().isAfter(project.getStartAt())) {
            throw new IllegalArgumentException("endAt must be after startAt");
        }
    }

    @Override
    @Transactional
    public ProjectEntity approve(UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (project.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be approved only from MODERATION");
        }

        project.setStatus(ProjectStatus.ACTIVE);
        project.setRejectionReason(null);
        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity reject(UUID projectId, String reason) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (project.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be rejected only from MODERATION");
        }

        project.setStatus(ProjectStatus.REJECTED);
        project.setRejectionReason(reason == null ? null : reason.trim());

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }
}
