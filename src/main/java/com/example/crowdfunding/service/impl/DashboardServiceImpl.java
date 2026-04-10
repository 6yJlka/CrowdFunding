package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.DashboardFounderResponse;
import com.example.crowdfunding.api.dto.DashboardMonthlyPointResponse;
import com.example.crowdfunding.api.dto.DashboardProjectRowResponse;
import com.example.crowdfunding.api.dto.DashboardResponse;
import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.service.DashboardService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final Locale DASHBOARD_LOCALE = Locale.ENGLISH;
    private static final List<ProjectStatus> DASHBOARD_STATUSES = List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED);

    private final ProjectRepository projectRepository;
    private final DonationRepository donationRepository;

    public DashboardServiceImpl(ProjectRepository projectRepository, DonationRepository donationRepository) {
        this.projectRepository = projectRepository;
        this.donationRepository = donationRepository;
    }

    @Override
    public DashboardResponse getDashboard() {
        List<ProjectEntity> topProjectsSource = projectRepository.findByStatusIn(
                DASHBOARD_STATUSES,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "collectedAmount"))
        );

        List<ProjectEntity> recentProjectsSource = projectRepository.findByStatusIn(
                DASHBOARD_STATUSES,
                PageRequest.of(0, 6, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<DonationEntity> dashboardDonations = donationRepository.findAllSucceededForDashboard(
                DonationStatus.SUCCEEDED,
                DASHBOARD_STATUSES
        );

        DashboardResponse response = new DashboardResponse();
        response.setTotalRaised(projectRepository.sumCollectedAmountByStatusIn(DASHBOARD_STATUSES));
        response.setActiveProjects(projectRepository.countByStatus(ProjectStatus.ACTIVE));
        response.setFundedProjects(projectRepository.countByStatus(ProjectStatus.FUNDED));
        response.setTotalBackers(
                donationRepository.countDistinctSponsorsByStatusAndProjectStatusIn(DonationStatus.SUCCEEDED, DASHBOARD_STATUSES)
        );
        response.setMonthlyRaised(buildMonthlySeries(dashboardDonations));
        response.setTopProjects(buildTopProjects(topProjectsSource));
        response.setRecentFounders(buildRecentFounders(recentProjectsSource));
        return response;
    }

    private List<DashboardMonthlyPointResponse> buildMonthlySeries(List<DonationEntity> donations) {
        OffsetDateTime firstProjectCreatedAt = projectRepository.findFirstProjectCreatedAt();
        OffsetDateTime firstDonationAt = donationRepository.findFirstRelevantDonationAt(
                DonationStatus.SUCCEEDED,
                DASHBOARD_STATUSES
        );

        OffsetDateTime seriesStartAt = firstProjectCreatedAt != null ? firstProjectCreatedAt : firstDonationAt;
        if (seriesStartAt == null) {
            return List.of();
        }

        YearMonth startMonth = YearMonth.from(seriesStartAt);
        YearMonth currentMonth = YearMonth.now();
        Map<YearMonth, BigDecimal> monthlyRaised = new LinkedHashMap<>();
        for (YearMonth month = startMonth; !month.isAfter(currentMonth); month = month.plusMonths(1)) {
            monthlyRaised.put(month, BigDecimal.ZERO);
        }

        for (DonationEntity donation : donations) {
            OffsetDateTime effectiveDate = donation.getConfirmedAt() != null ? donation.getConfirmedAt() : donation.getCreatedAt();
            if (effectiveDate == null || donation.getAmount() == null) {
                continue;
            }

            YearMonth month = YearMonth.from(effectiveDate);
            if (!monthlyRaised.containsKey(month)) {
                continue;
            }

            monthlyRaised.computeIfPresent(month, (key, value) -> value.add(donation.getAmount()));
        }

        List<DashboardMonthlyPointResponse> result = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (Map.Entry<YearMonth, BigDecimal> entry : monthlyRaised.entrySet()) {
            cumulative = cumulative.add(entry.getValue());
            result.add(new DashboardMonthlyPointResponse(formatMonthLabel(entry.getKey(), startMonth, currentMonth), cumulative));
        }
        return result;
    }

    private String formatMonthLabel(YearMonth month, YearMonth startMonth, YearMonth currentMonth) {
        String monthLabel = month.getMonth().getDisplayName(TextStyle.SHORT, DASHBOARD_LOCALE);
        if (month.equals(startMonth) || month.getMonthValue() == 1 || month.equals(currentMonth)) {
            return monthLabel + " " + month.getYear();
        }
        return monthLabel;
    }

    private List<DashboardProjectRowResponse> buildTopProjects(List<ProjectEntity> projects) {
        return projects.stream()
                .map(this::mapProjectRow)
                .toList();
    }

    private DashboardProjectRowResponse mapProjectRow(ProjectEntity project) {
        DashboardProjectRowResponse row = new DashboardProjectRowResponse();
        row.setId(project.getId());
        row.setTitle(project.getTitle());
        row.setAuthorDisplayName(project.getAuthor().getDisplayName());
        row.setCategoryTitle(project.getCategory() != null ? project.getCategory().getTitle() : "General");
        row.setCollectedAmount(defaultAmount(project.getCollectedAmount()));
        row.setGoalAmount(defaultAmount(project.getGoalAmount()));
        row.setProgressPercent(toPercent(project.getCollectedAmount(), project.getGoalAmount()));
        row.setCurrency(project.getCurrency());
        return row;
    }

    private List<DashboardFounderResponse> buildRecentFounders(List<ProjectEntity> projects) {
        return projects.stream()
                .map(project -> {
                    DashboardFounderResponse founder = new DashboardFounderResponse();
                    founder.setAuthorId(project.getAuthor().getId());
                    founder.setAuthorDisplayName(project.getAuthor().getDisplayName());
                    founder.setProjectTitle(project.getTitle());
                    founder.setCategoryTitle(project.getCategory() != null ? project.getCategory().getTitle() : "General");
                    founder.setCreatedAt(project.getCreatedAt());
                    return founder;
                })
                .toList();
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private BigDecimal toPercent(BigDecimal amount, BigDecimal goal) {
        if (amount == null || goal == null || goal.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return amount
                .multiply(BigDecimal.valueOf(100))
                .divide(goal, 1, RoundingMode.HALF_UP);
    }
}
