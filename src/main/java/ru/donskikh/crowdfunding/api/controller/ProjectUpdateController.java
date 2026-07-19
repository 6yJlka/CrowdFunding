package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import ru.donskikh.crowdfunding.api.dto.ProjectUpdateResponse;
import ru.donskikh.crowdfunding.api.mapper.ProjectUpdateMapper;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.ProjectUpdateService;
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

    @PreAuthorize("hasRole('AUTHOR')")
    @PostMapping
    public ProjectUpdateResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUpdateCreateRequest req
    ) {
        return ProjectUpdateMapper.toResponse(projectUpdateService.create(user.getId(), projectId, req));
    }

    @GetMapping
    public List<ProjectUpdateResponse> list(@PathVariable UUID projectId) {
        return projectUpdateService.listByProject(projectId)
                .stream()
                .map(ProjectUpdateMapper::toResponse)
                .toList();
    }
}
