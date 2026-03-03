package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectStatisticsResponse;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.service.ProjectStatisticsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
        // Получаем проект
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        // Суммируем все успешные пожертвования для проекта (статус "SUCCEEDED")
        BigDecimal totalAmount = donationRepository.sumDonationsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED);

        // Подсчитываем количество уникальных доноров с успешными пожертвованиями
        Integer totalDonors = donationRepository.countDistinctSponsorsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED);

        // Получаем цель проекта
        BigDecimal goalAmount = project.getGoalAmount();

        // Вычисляем прогресс
        BigDecimal progress = totalAmount.divide(goalAmount, 2, BigDecimal.ROUND_HALF_UP).multiply(BigDecimal.valueOf(100));

        // Заполняем ответ
        ProjectStatisticsResponse response = new ProjectStatisticsResponse();
        response.setTotalAmount(totalAmount);
        response.setTotalDonors(totalDonors);
        response.setGoalAmount(goalAmount);
        response.setProgress(progress);

        return response;
    }
}