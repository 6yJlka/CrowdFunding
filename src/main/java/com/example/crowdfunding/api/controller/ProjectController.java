package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectCreateRequest;
import com.example.crowdfunding.api.dto.ProjectResponse;
import com.example.crowdfunding.api.dto.ProjectUpdateRequest;
import com.example.crowdfunding.api.mapper.ProjectMapper;
import com.example.crowdfunding.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // Создать проект (AUTHOR). Пока authorId берём из заголовка X-User-Id
    @PostMapping
    public ProjectResponse create(
            @RequestHeader("X-User-Id") UUID authorId,
            @Valid @RequestBody ProjectCreateRequest req
    ) {
        return ProjectMapper.toResponse(projectService.create(authorId, req));
    }

    // Обновить проект (только автор, только DRAFT/REJECTED)
    @PutMapping("/{id}")
    public ProjectResponse update(
            @RequestHeader("X-User-Id") UUID authorId,
            @PathVariable("id") UUID projectId,
            @Valid @RequestBody ProjectUpdateRequest req
    ) {
        return ProjectMapper.toResponse(projectService.update(authorId, projectId, req));
    }

    // Отправить на модерацию
    @PostMapping("/{id}/submit")
    public ProjectResponse submit(
            @RequestHeader("X-User-Id") UUID authorId,
            @PathVariable("id") UUID projectId
    ) {
        return ProjectMapper.toResponse(projectService.submitToModeration(authorId, projectId));
    }

    // Каталог активных проектов (публично)
    @GetMapping
    public Page<ProjectResponse> catalog(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return projectService.getCatalog(q, pageable).map(ProjectMapper::toResponse);
    }

    // Карточка проекта (публично)
    @GetMapping("/{id}")
    public ProjectResponse getById(@PathVariable("id") UUID projectId) {
        return ProjectMapper.toResponse(projectService.getById(projectId));
    }
}