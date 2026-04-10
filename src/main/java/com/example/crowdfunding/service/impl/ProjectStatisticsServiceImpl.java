package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectStatisticsResponse;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.service.ProjectStatisticsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class ProjectStatisticsServiceImpl implements ProjectStatisticsService {

    private final DonationRepository donationRepository;
    private final ProjectRepository projectRepository;

    public ProjectStatisticsServiceImpl(DonationRepository donationRepository, ProjectRepository projectRepository) {
        this.donationRepository = donationRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public ProjectStatisticsResponse getStatistics(UUID projectId) {
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        BigDecimal totalAmount = donationRepository.sumDonationsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED);
        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }

        Integer totalDonors = donationRepository.countDistinctSponsorsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED);
        if (totalDonors == null) {
            totalDonors = 0;
        }

        BigDecimal goalAmount = project.getGoalAmount();
        if (goalAmount == null) {
            goalAmount = BigDecimal.ZERO;
        }

        BigDecimal progress = BigDecimal.ZERO;
        if (goalAmount.signum() > 0) {
            progress = totalAmount.multiply(BigDecimal.valueOf(100))
                    .divide(goalAmount, 2, RoundingMode.HALF_UP);
        }

        ProjectStatisticsResponse response = new ProjectStatisticsResponse();
        response.setTotalAmount(totalAmount);
        response.setTotalDonors(totalDonors);
        response.setGoalAmount(goalAmount);
        response.setProgress(progress);
        return response;
    }
}
