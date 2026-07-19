package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectResponse;
import ru.donskikh.crowdfunding.api.dto.RejectProjectRequest;
import ru.donskikh.crowdfunding.api.mapper.ProjectMapper;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/projects")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProjectController {

    private final ProjectService projectService;

    public AdminProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public Page<ProjectResponse> moderationQueue(
            @RequestParam(name = "status", defaultValue = "MODERATION") ProjectStatus status,
            Pageable pageable
    ) {
        return projectService.getProjectsByStatus(status, pageable).map(ProjectMapper::toResponse);
    }

    @PostMapping("/{id}/approve")
    public ProjectResponse approve(@PathVariable("id") UUID projectId) {
        return ProjectMapper.toResponse(projectService.approve(projectId));
    }

    @PostMapping("/{id}/reject")
    public ProjectResponse reject(
            @PathVariable("id") UUID projectId,
            @Valid @RequestBody RejectProjectRequest req
    ) {
        return ProjectMapper.toResponse(projectService.reject(projectId, req.getReason()));
    }
}
