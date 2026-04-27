package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectStatisticsResponse;
import com.example.crowdfunding.service.ProjectStatisticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectStatisticsControllerTest {

    @Mock
    private ProjectStatisticsService projectStatisticsService;

    @InjectMocks
    private ProjectStatisticsController controller;

    @Test
    void getStatisticsDelegatesToService() {
        UUID projectId = UUID.randomUUID();
        ProjectStatisticsResponse response = new ProjectStatisticsResponse();
        response.setProgress(BigDecimal.TEN);
        when(projectStatisticsService.getStatistics(projectId)).thenReturn(response);

        assertThat(controller.getStatistics(projectId)).isEqualTo(response);
    }
}
