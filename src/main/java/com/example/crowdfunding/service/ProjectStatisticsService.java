package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.ProjectStatisticsResponse;

import java.util.UUID;

public interface ProjectStatisticsService {
    ProjectStatisticsResponse getStatistics(UUID projectId);
}
