package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.DashboardResponse;
import ru.donskikh.crowdfunding.domain.entity.CategoryEntity;
import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import ru.donskikh.crowdfunding.domain.enums.RoleCode;
import ru.donskikh.crowdfunding.domain.enums.UserStatus;
import ru.donskikh.crowdfunding.domain.repository.DonationRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static ru.donskikh.crowdfunding.domain.enums.ProjectStatus.ACTIVE;
import static ru.donskikh.crowdfunding.domain.enums.ProjectStatus.FUNDED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private DonationRepository donationRepository;

    @InjectMocks
    private DashboardServiceImpl service;

    @Test
    void getDashboardBuildsAggregatesSeriesAndPublicCards() {
        OffsetDateTime now = OffsetDateTime.now();

        UserEntity author1 = user("Alice", true);
        UserEntity author2 = user("Bob", false);
        UserEntity sponsor1 = user("Sponsor 1", true);
        UserEntity sponsor2 = user("Sponsor 2", false);

        CategoryEntity tech = category(1L, "Tech");

        ProjectEntity project1 = project("Drone", author1, tech, BigDecimal.valueOf(1000), BigDecimal.valueOf(2000), now.minusDays(2), "RUB");
        ProjectEntity project2 = project("Laser", author1, null, BigDecimal.valueOf(400), BigDecimal.valueOf(1000), now.minusDays(1), "RUB");
        ProjectEntity project3 = project("Board", author2, null, BigDecimal.valueOf(700), BigDecimal.valueOf(1400), now.minusHours(12), "USD");

        DonationEntity donation1 = donation(project1, sponsor1, BigDecimal.valueOf(200), now.minusDays(1), now.minusDays(1).plusHours(1));
        DonationEntity donation2 = donation(project2, sponsor2, BigDecimal.valueOf(300), now.minusHours(10), null);
        DonationEntity sponsorRepeat = donation(project1, sponsor1, BigDecimal.valueOf(50), now.minusHours(5), now.minusHours(4));

        when(projectRepository.findByStatusIn(eq(List.of(ACTIVE, FUNDED)), eq(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "collectedAmount")))))
                .thenReturn(List.of(project1, project3));
        when(projectRepository.findByStatusIn(eq(List.of(ACTIVE, FUNDED)), eq(PageRequest.of(0, 24, Sort.by(Sort.Direction.DESC, "createdAt")))))
                .thenReturn(List.of(project3, project2, project1));
        when(donationRepository.findAllSucceededForDashboard(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED)))
                .thenReturn(List.of(donation1, donation2));
        when(projectRepository.sumCollectedAmountByStatusIn(List.of(ACTIVE, FUNDED))).thenReturn(BigDecimal.valueOf(2100));
        when(projectRepository.countByStatus(ACTIVE)).thenReturn(2L);
        when(projectRepository.countByStatus(FUNDED)).thenReturn(1L);
        when(donationRepository.countDistinctSponsorsByStatusAndProjectStatusIn(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED))).thenReturn(2L);
        when(projectRepository.findFirstProjectCreatedAt()).thenReturn(now.minusDays(2));
        when(donationRepository.findFirstRelevantDonationAt(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED))).thenReturn(now.minusDays(1));
        when(donationRepository.findRecentPublicSponsorDonations(
                eq(DonationStatus.SUCCEEDED),
                eq(List.of(ACTIVE, FUNDED)),
                eq(UserStatus.ACTIVE),
                eq(RoleCode.SPONSOR),
                any(PageRequest.class)
        )).thenReturn(List.of(sponsorRepeat, donation2));

        DashboardResponse response = service.getDashboard();

        assertThat(response.getTotalRaised()).isEqualByComparingTo("2100");
        assertThat(response.getActiveProjects()).isEqualTo(2);
        assertThat(response.getFundedProjects()).isEqualTo(1);
        assertThat(response.getTotalBackers()).isEqualTo(2);
        assertThat(response.getTopProjects()).hasSize(2);
        assertThat(response.getTopProjects().get(0).getTitle()).isEqualTo("Drone");
        assertThat(response.getTopProjects().get(0).getProgressPercent()).isEqualByComparingTo("50.0");
        assertThat(response.getTopProjectsYear()).extracting("title").containsExactly("Laser", "Drone");
        assertThat(response.getTopProjectsMonth()).extracting("title").containsExactly("Laser", "Drone");
        assertThat(response.getMonthlyRaised()).isNotEmpty();
        assertThat(response.getMonthlyRaised().getLast().getAmount()).isEqualByComparingTo("500");
        assertThat(response.getRecentFounders()).hasSize(2);
        assertThat(response.getRecentFounders().get(0).getAuthorDisplayName()).isEqualTo("Bob");
        assertThat(response.getRecentFounders().get(1).isHasAvatar()).isTrue();
        assertThat(response.getRecentSponsors()).hasSize(2);
        assertThat(response.getRecentSponsors().get(0).getSponsorDisplayName()).isEqualTo("Sponsor 1");
        assertThat(response.getRecentSponsors().get(0).isHasAvatar()).isTrue();
    }

    @Test
    void getDashboardReturnsEmptySeriesWhenThereIsNoTimelineStart() {
        when(projectRepository.findByStatusIn(eq(List.of(ACTIVE, FUNDED)), any(PageRequest.class))).thenReturn(List.of());
        when(donationRepository.findAllSucceededForDashboard(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED))).thenReturn(List.of());
        when(projectRepository.sumCollectedAmountByStatusIn(List.of(ACTIVE, FUNDED))).thenReturn(BigDecimal.ZERO);
        when(projectRepository.countByStatus(ACTIVE)).thenReturn(0L);
        when(projectRepository.countByStatus(FUNDED)).thenReturn(0L);
        when(donationRepository.countDistinctSponsorsByStatusAndProjectStatusIn(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED))).thenReturn(0L);
        when(projectRepository.findFirstProjectCreatedAt()).thenReturn(null);
        when(donationRepository.findFirstRelevantDonationAt(DonationStatus.SUCCEEDED, List.of(ACTIVE, FUNDED))).thenReturn(null);
        when(donationRepository.findRecentPublicSponsorDonations(
                eq(DonationStatus.SUCCEEDED),
                eq(List.of(ACTIVE, FUNDED)),
                eq(UserStatus.ACTIVE),
                eq(RoleCode.SPONSOR),
                any(PageRequest.class)
        )).thenReturn(List.of());

        DashboardResponse response = service.getDashboard();

        assertThat(response.getMonthlyRaised()).isEmpty();
        assertThat(response.getTopProjects()).isEmpty();
        assertThat(response.getRecentFounders()).isEmpty();
        assertThat(response.getRecentSponsors()).isEmpty();
    }

    private static UserEntity user(String name, boolean withAvatar) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setDisplayName(name);
        user.setAvatarContentType(withAvatar ? "image/png" : null);
        return user;
    }

    private static CategoryEntity category(Long id, String title) {
        CategoryEntity category = new CategoryEntity();
        category.setId(id);
        category.setTitle(title);
        return category;
    }

    private static ProjectEntity project(String title, UserEntity author, CategoryEntity category, BigDecimal collected, BigDecimal goal, OffsetDateTime createdAt, String currency) {
        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setTitle(title);
        project.setAuthor(author);
        project.setCategory(category);
        project.setCollectedAmount(collected);
        project.setGoalAmount(goal);
        project.setCreatedAt(createdAt);
        project.setCurrency(currency);
        return project;
    }

    private static DonationEntity donation(ProjectEntity project, UserEntity sponsor, BigDecimal amount, OffsetDateTime createdAt, OffsetDateTime confirmedAt) {
        DonationEntity donation = new DonationEntity();
        donation.setId(UUID.randomUUID());
        donation.setProject(project);
        donation.setSponsor(sponsor);
        donation.setAmount(amount);
        donation.setCreatedAt(createdAt);
        donation.setConfirmedAt(confirmedAt);
        donation.setStatus(DonationStatus.SUCCEEDED);
        return donation;
    }
}
