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

        ProjectEntity p = new ProjectEntity();
        p.setAuthor(author);

        applyCreateOrUpdate(
                p,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );

        p.setStatus(ProjectStatus.DRAFT);

        ProjectEntity saved = projectRepository.save(p);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity update(UUID authorId, UUID projectId, ProjectUpdateRequest req) {
        ProjectEntity p = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        // ВНИМАНИЕ: p.getAuthor() может быть LAZY, но мы внутри транзакции -> это безопасно
        if (!p.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can update this project");
        }

        if (p.getStatus() != ProjectStatus.DRAFT && p.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be edited only in DRAFT or REJECTED");
        }

        applyCreateOrUpdate(
                p,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );

        ProjectEntity saved = projectRepository.save(p);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity submitToModeration(UUID authorId, UUID projectId) {
        ProjectEntity p = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!p.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can submit this project");
        }

        if (p.getStatus() != ProjectStatus.DRAFT && p.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be submitted only from DRAFT or REJECTED");
        }

        p.setStatus(ProjectStatus.MODERATION);

        ProjectEntity saved = projectRepository.save(p);
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
        // После добавления @EntityGraph в репозиторий тут уже будут подгружены author/category
        if (q == null || q.isBlank()) {
            return projectRepository.findByStatus(ProjectStatus.ACTIVE, pageable);
        }
        return projectRepository.findByStatusAndTitleContainingIgnoreCase(ProjectStatus.ACTIVE, q.trim(), pageable);
    }

    private ProjectEntity loadForResponse(UUID projectId) {
        return projectRepository.findWithAuthorAndCategoryById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
    }

    private void applyCreateOrUpdate(ProjectEntity p,
                                     Long categoryId,
                                     String title,
                                     String shortDescription,
                                     String description,
                                     java.math.BigDecimal goalAmount,
                                     String currency,
                                     java.time.OffsetDateTime startAt,
                                     java.time.OffsetDateTime endAt) {

        p.setTitle(title);
        p.setShortDescription(shortDescription);
        p.setDescription(description);
        p.setGoalAmount(goalAmount);
        p.setCurrency(currency);
        p.setStartAt(startAt);
        p.setEndAt(endAt);

        if (categoryId == null) {
            p.setCategory(null);
        } else {
            CategoryEntity cat = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new EntityNotFoundException("Category not found: " + categoryId));
            p.setCategory(cat);
        }

        if (p.getStartAt() != null && p.getEndAt() != null && !p.getEndAt().isAfter(p.getStartAt())) {
            throw new IllegalArgumentException("endAt must be after startAt");
        }
    }

    @Override
    @Transactional
    public ProjectEntity approve(UUID projectId) {
        ProjectEntity p = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (p.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be approved only from MODERATION");
        }

        p.setStatus(ProjectStatus.ACTIVE);
        ProjectEntity saved = projectRepository.save(p);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity reject(UUID projectId, String reason) {
        ProjectEntity p = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (p.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be rejected only from MODERATION");
        }

        // Причину пока никуда не пишем (нет поля/таблицы) — оставим на будущее.
        // Можно залогировать или добавить таблицу project_moderation_log позже.
        p.setStatus(ProjectStatus.REJECTED);

        ProjectEntity saved = projectRepository.save(p);
        return loadForResponse(saved.getId());
    }
}