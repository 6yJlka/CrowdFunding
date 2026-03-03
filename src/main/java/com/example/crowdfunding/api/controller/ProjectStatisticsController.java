package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectStatisticsResponse;
import com.example.crowdfunding.service.ProjectStatisticsService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/statistics")
public class ProjectStatisticsController {

    private final ProjectStatisticsService projectStatisticsService;

    public ProjectStatisticsController(ProjectStatisticsService projectStatisticsService) {
        this.projectStatisticsService = projectStatisticsService;
    }

    @GetMapping
    public ProjectStatisticsResponse getStatistics(@PathVariable UUID projectId) {
        return projectStatisticsService.getStatistics(projectId);
    }
}