package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectResponse;
import com.example.crowdfunding.api.dto.RejectProjectRequest;
import com.example.crowdfunding.api.mapper.ProjectMapper;
import com.example.crowdfunding.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/projects")
public class AdminProjectController {

    private final ProjectService projectService;

    public AdminProjectController(ProjectService projectService) {
        this.projectService = projectService;
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