package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectReviewRequest;
import com.example.crowdfunding.api.dto.ProjectReviewResponse;
import com.example.crowdfunding.api.mapper.ProjectReviewMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectReviewService;
import jakarta.validation.Valid;
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

    // Создание отзыва (спонсор или автор проекта)
    @PostMapping
    public ProjectReviewResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectReviewRequest request
    ) {
        return ProjectReviewMapper.toResponse(projectReviewService.create(user.getId(), projectId, request));
    }

    // Получить все отзывы для проекта (публично)
    @GetMapping
    public List<ProjectReviewResponse> getAll(@PathVariable UUID projectId) {
        return projectReviewService.getAllByProject(projectId)
                .stream()
                .map(ProjectReviewMapper::toResponse)
                .toList();
    }
}