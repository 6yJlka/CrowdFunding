package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectCreateRequest;
import com.example.crowdfunding.api.dto.ProjectResponse;
import com.example.crowdfunding.api.dto.ProjectUpdateRequest;
import com.example.crowdfunding.api.mapper.ProjectMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // Создать проект (AUTHOR)
    @PreAuthorize("hasRole('AUTHOR')")
    @PostMapping
    public ProjectResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody ProjectCreateRequest req
    ) {
        return ProjectMapper.toResponse(projectService.create(user.getId(), req));
    }

    // Обновить проект (AUTHOR)
    @PreAuthorize("hasRole('AUTHOR')")
    @PutMapping("/{id}")
    public ProjectResponse update(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable("id") UUID projectId,
            @Valid @RequestBody ProjectUpdateRequest req
    ) {
        return ProjectMapper.toResponse(projectService.update(user.getId(), projectId, req));
    }

    // Отправить на модерацию (AUTHOR)
    @PreAuthorize("hasRole('AUTHOR')")
    @PostMapping("/{id}/submit")
    public ProjectResponse submit(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable("id") UUID projectId
    ) {
        return ProjectMapper.toResponse(projectService.submitToModeration(user.getId(), projectId));
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