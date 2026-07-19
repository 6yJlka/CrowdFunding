package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectReviewRequest;
import ru.donskikh.crowdfunding.api.dto.ProjectReviewResponse;
import ru.donskikh.crowdfunding.api.mapper.ProjectReviewMapper;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.ProjectReviewService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/reviews")
public class ProjectReviewController {

    private final ProjectReviewService projectReviewService;

    public ProjectReviewController(ProjectReviewService projectReviewService) {
        this.projectReviewService = projectReviewService;
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public ProjectReviewResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectReviewRequest request
    ) {
        return ProjectReviewMapper.toResponse(projectReviewService.create(user.getId(), projectId, request));
    }

    @GetMapping
    public List<ProjectReviewResponse> getAll(@PathVariable UUID projectId) {
        return projectReviewService.getAllByProject(projectId)
                .stream()
                .map(ProjectReviewMapper::toResponse)
                .toList();
    }
}
