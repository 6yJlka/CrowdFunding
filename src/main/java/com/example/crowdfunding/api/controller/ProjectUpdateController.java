package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import com.example.crowdfunding.api.dto.ProjectUpdateResponse;
import com.example.crowdfunding.api.mapper.ProjectUpdateMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectUpdateService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/updates")
public class ProjectUpdateController {

    private final ProjectUpdateService projectUpdateService;

    public ProjectUpdateController(ProjectUpdateService projectUpdateService) {
        this.projectUpdateService = projectUpdateService;
    }

    // Создать обновление (только AUTHOR)
    @PreAuthorize("hasRole('AUTHOR')")
    @PostMapping
    public ProjectUpdateResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUpdateCreateRequest req
    ) {
        return ProjectUpdateMapper.toResponse(projectUpdateService.create(user.getId(), projectId, req));
    }

    // Список обновлений (публично)
    @GetMapping
    public List<ProjectUpdateResponse> list(@PathVariable UUID projectId) {
        return projectUpdateService.listByProject(projectId)
                .stream()
                .map(ProjectUpdateMapper::toResponse)
                .toList();
    }
}