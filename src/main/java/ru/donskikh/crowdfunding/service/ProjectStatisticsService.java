package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.ProjectStatisticsResponse;

import java.util.UUID;

public interface ProjectStatisticsService {
    ProjectStatisticsResponse getStatistics(UUID projectId);
}
