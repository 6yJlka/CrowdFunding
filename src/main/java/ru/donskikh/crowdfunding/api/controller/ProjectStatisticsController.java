package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectStatisticsResponse;
import ru.donskikh.crowdfunding.service.ProjectStatisticsService;
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