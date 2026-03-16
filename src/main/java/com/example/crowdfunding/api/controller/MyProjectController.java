package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectResponse;
import com.example.crowdfunding.api.mapper.ProjectMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/me/projects")
@PreAuthorize("hasRole('AUTHOR')")
public class MyProjectController {

    private final ProjectService projectService;

    public MyProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public Page<ProjectResponse> myProjects(
            @AuthenticationPrincipal AppUserDetails user,
            Pageable pageable
    ) {
        return projectService.getAuthorProjects(user.getId(), pageable).map(ProjectMapper::toResponse);
    }

    @PostMapping("/{id}/submit")
    public ProjectResponse submit(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable("id") UUID projectId
    ) {
        return ProjectMapper.toResponse(projectService.submitToModeration(user.getId(), projectId));
    }
}
