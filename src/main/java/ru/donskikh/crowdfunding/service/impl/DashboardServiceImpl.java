package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.DashboardFounderResponse;
import ru.donskikh.crowdfunding.api.dto.DashboardMonthlyPointResponse;
import ru.donskikh.crowdfunding.api.dto.DashboardProjectRowResponse;
import ru.donskikh.crowdfunding.api.dto.DashboardResponse;
import ru.donskikh.crowdfunding.api.dto.DashboardSponsorResponse;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.domain.repository.DonationRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import ru.donskikh.crowdfunding.service.DashboardService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final Locale DASHBOARD_LOCALE = Locale.ENGLISH;
    private static final List<ProjectStatus> DASHBOARD_STATUSES = List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED);
    private static final int DASHBOARD_TOP_PROJECTS_LIMIT = 10;
    private static final int DASHBOARD_RECENT_FOUNDERS_LIMIT = 6;
    private static final int DASHBOARD_RECENT_PROJECT_POOL_SIZE = 24;
    private static final int DASHBOARD_RECENT_SPONSORS_LIMIT = 5;
    private static final int DASHBOARD_RECENT_DONATIONS_POOL_SIZE = 24;

    private final ProjectRepository projectRepository;
    private final DonationRepository donationRepository;

    public DashboardServiceImpl(ProjectRepository projectRepository, DonationRepository donationRepository) {
        this.projectRepository = projectRepository;
        this.donationRepository = donationRepository;
    }

    @Override
    public DashboardResponse getDashboard() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime currentYearStart = now.withDayOfYear(1).toLocalDate().atStartOfDay().atOffset(now.getOffset());
        OffsetDateTime currentMonthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay().atOffset(now.getOffset());

        List<ProjectEntity> topProjectsSource = projectRepository.findByStatusIn(
                DASHBOARD_STATUSES,
                PageRequest.of(0, DASHBOARD_TOP_PROJECTS_LIMIT, Sort.by(Sort.Direction.DESC, "collectedAmount"))
        );

        List<ProjectEntity> recentProjectsSource = projectRepository.findByStatusIn(
                DASHBOARD_STATUSES,
                PageRequest.of(0, DASHBOARD_RECENT_PROJECT_POOL_SIZE, Sort.by(Sort.Direction.DESC, "createdAt"))
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
        response.setTopProjectsYear(buildTopProjectsForPeriod(dashboardDonations, currentYearStart));
        response.setTopProjectsMonth(buildTopProjectsForPeriod(dashboardDonations, currentMonthStart));
        response.setRecentFounders(buildRecentFounders(recentProjectsSource));
        response.setRecentSponsors(buildRecentSponsors());
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
        if (startMonth.equals(currentMonth)) {
            return buildDailySeries(donations, seriesStartAt);
        }

        return buildMonthlySeries(donations, startMonth, currentMonth);
    }

    private List<DashboardMonthlyPointResponse> buildMonthlySeries(
            List<DonationEntity> donations,
            YearMonth startMonth,
            YearMonth currentMonth
    ) {
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

    private List<DashboardMonthlyPointResponse> buildDailySeries(List<DonationEntity> donations, OffsetDateTime seriesStartAt) {
        LocalDate startDate = seriesStartAt.toLocalDate();
        LocalDate currentDate = OffsetDateTime.now().toLocalDate();
        Map<LocalDate, BigDecimal> dailyRaised = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(currentDate); date = date.plusDays(1)) {
            dailyRaised.put(date, BigDecimal.ZERO);
        }

        for (DonationEntity donation : donations) {
            OffsetDateTime effectiveDate = donation.getConfirmedAt() != null ? donation.getConfirmedAt() : donation.getCreatedAt();
            if (effectiveDate == null || donation.getAmount() == null) {
                continue;
            }

            LocalDate donationDate = effectiveDate.toLocalDate();
            if (!dailyRaised.containsKey(donationDate)) {
                continue;
            }

            dailyRaised.computeIfPresent(donationDate, (key, value) -> value.add(donation.getAmount()));
        }

        List<DashboardMonthlyPointResponse> result = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (Map.Entry<LocalDate, BigDecimal> entry : dailyRaised.entrySet()) {
            cumulative = cumulative.add(entry.getValue());
            result.add(new DashboardMonthlyPointResponse(formatDayLabel(entry.getKey(), startDate, currentDate), cumulative));
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

    private String formatDayLabel(LocalDate date, LocalDate startDate, LocalDate currentDate) {
        String monthLabel = date.getMonth().getDisplayName(TextStyle.SHORT, DASHBOARD_LOCALE);
        if (date.equals(startDate) || date.equals(currentDate)) {
            return date.getDayOfMonth() + " " + monthLabel + " " + date.getYear();
        }
        return date.getDayOfMonth() + " " + monthLabel;
    }

    private List<DashboardProjectRowResponse> buildTopProjects(List<ProjectEntity> projects) {
        return projects.stream()
                .map(this::mapProjectRow)
                .toList();
    }

    private List<DashboardProjectRowResponse> buildTopProjectsForPeriod(
            List<DonationEntity> donations,
            OffsetDateTime periodStartAt
    ) {
        Map<UUID, ProjectPeriodStats> totalsByProject = new LinkedHashMap<>();

        for (DonationEntity donation : donations) {
            OffsetDateTime effectiveDate = donation.getConfirmedAt() != null ? donation.getConfirmedAt() : donation.getCreatedAt();
            if (effectiveDate == null || donation.getAmount() == null || effectiveDate.isBefore(periodStartAt)) {
                continue;
            }

            ProjectEntity project = donation.getProject();
            if (project == null) {
                continue;
            }

            ProjectPeriodStats currentStats = totalsByProject.get(project.getId());
            if (currentStats == null) {
                currentStats = new ProjectPeriodStats(project);
            }
            totalsByProject.put(project.getId(), currentStats.accumulate(donation.getAmount(), effectiveDate));
        }

        return totalsByProject.values().stream()
                .sorted(Comparator
                        .comparing(ProjectPeriodStats::totalRaised).reversed()
                        .thenComparing(ProjectPeriodStats::lastDonationAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(stats -> {
                            String title = stats.project().getTitle();
                            return title == null ? "" : title.toLowerCase(Locale.ROOT);
                        }))
                .limit(DASHBOARD_TOP_PROJECTS_LIMIT)
                .map(stats -> mapProjectRow(stats.project(), stats.totalRaised()))
                .toList();
    }

    private DashboardProjectRowResponse mapProjectRow(ProjectEntity project) {
        return mapProjectRow(project, defaultAmount(project.getCollectedAmount()));
    }

    private DashboardProjectRowResponse mapProjectRow(ProjectEntity project, BigDecimal collectedAmount) {
        DashboardProjectRowResponse row = new DashboardProjectRowResponse();
        row.setId(project.getId());
        row.setTitle(project.getTitle());
        row.setAuthorDisplayName(project.getAuthor().getDisplayName());
        row.setCategoryTitle(project.getCategory() != null ? project.getCategory().getTitle() : "General");
        row.setCollectedAmount(defaultAmount(collectedAmount));
        row.setGoalAmount(defaultAmount(project.getGoalAmount()));
        row.setProgressPercent(toPercent(collectedAmount, project.getGoalAmount()));
        row.setCurrency(project.getCurrency());
        return row;
    }

    private record ProjectPeriodStats(ProjectEntity project, BigDecimal totalRaised, OffsetDateTime lastDonationAt) {

        private ProjectPeriodStats(ProjectEntity project) {
            this(project, BigDecimal.ZERO, null);
        }

        private ProjectPeriodStats accumulate(BigDecimal amount, OffsetDateTime donationAt) {
            OffsetDateTime latestDonationAt = lastDonationAt == null || donationAt.isAfter(lastDonationAt)
                    ? donationAt
                    : lastDonationAt;
            return new ProjectPeriodStats(project, totalRaised.add(amount), latestDonationAt);
        }
    }

    private List<DashboardFounderResponse> buildRecentFounders(List<ProjectEntity> projects) {
        Map<java.util.UUID, DashboardFounderResponse> uniqueFounders = new LinkedHashMap<>();

        for (ProjectEntity project : projects) {
            java.util.UUID authorId = project.getAuthor().getId();
            if (uniqueFounders.containsKey(authorId)) {
                continue;
            }

            DashboardFounderResponse founder = new DashboardFounderResponse();
            founder.setAuthorId(authorId);
            founder.setAuthorDisplayName(project.getAuthor().getDisplayName());
            founder.setProjectTitle(project.getTitle());
            founder.setCategoryTitle(project.getCategory() != null ? project.getCategory().getTitle() : "General");
            founder.setCreatedAt(project.getCreatedAt());
            founder.setHasAvatar(project.getAuthor().getAvatarContentType() != null && !project.getAuthor().getAvatarContentType().isBlank());
            uniqueFounders.put(authorId, founder);

            if (uniqueFounders.size() >= DASHBOARD_RECENT_FOUNDERS_LIMIT) {
                break;
            }
        }

        return new ArrayList<>(uniqueFounders.values());
    }

    private List<DashboardSponsorResponse> buildRecentSponsors() {
        List<DonationEntity> donations = donationRepository.findRecentPublicSponsorDonations(
                DonationStatus.SUCCEEDED,
                DASHBOARD_STATUSES,
                UserStatus.ACTIVE,
                RoleCode.SPONSOR,
                PageRequest.of(0, DASHBOARD_RECENT_DONATIONS_POOL_SIZE)
        );

        Map<java.util.UUID, DashboardSponsorResponse> uniqueSponsors = new LinkedHashMap<>();
        for (DonationEntity donation : donations) {
            java.util.UUID sponsorId = donation.getSponsor().getId();
            if (uniqueSponsors.containsKey(sponsorId)) {
                continue;
            }

            DashboardSponsorResponse sponsor = new DashboardSponsorResponse();
            sponsor.setSponsorId(sponsorId);
            sponsor.setSponsorDisplayName(donation.getSponsor().getDisplayName());
            sponsor.setSupportedAt(donation.getConfirmedAt() != null ? donation.getConfirmedAt() : donation.getCreatedAt());
            sponsor.setHasAvatar(donation.getSponsor().getAvatarContentType() != null && !donation.getSponsor().getAvatarContentType().isBlank());
            uniqueSponsors.put(sponsorId, sponsor);

            if (uniqueSponsors.size() >= DASHBOARD_RECENT_SPONSORS_LIMIT) {
                break;
            }
        }

        return new ArrayList<>(uniqueSponsors.values());
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
