package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import ru.donskikh.crowdfunding.domain.repository.DonationRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectStatisticsServiceImplTest {

    @Mock
    private DonationRepository donationRepository;
    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectStatisticsServiceImpl service;

    @Test
    void getStatisticsRejectsMissingProject() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getStatistics(projectId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Project not found");
    }

    @Test
    void getStatisticsDefaultsNullAggregatesAndGoalToZero() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setGoalAmount(null);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(donationRepository.sumDonationsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED)).thenReturn(null);
        when(donationRepository.countDistinctSponsorsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED)).thenReturn(null);

        var response = service.getStatistics(projectId);

        assertThat(response.getTotalAmount()).isEqualByComparingTo("0");
        assertThat(response.getTotalDonors()).isZero();
        assertThat(response.getGoalAmount()).isEqualByComparingTo("0");
        assertThat(response.getProgress()).isEqualByComparingTo("0");
    }

    @Test
    void getStatisticsCalculatesProgress() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setGoalAmount(BigDecimal.valueOf(800));

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(donationRepository.sumDonationsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED)).thenReturn(BigDecimal.valueOf(250));
        when(donationRepository.countDistinctSponsorsByProjectIdAndStatus(projectId, DonationStatus.SUCCEEDED)).thenReturn(3);

        var response = service.getStatistics(projectId);

        assertThat(response.getTotalAmount()).isEqualByComparingTo("250");
        assertThat(response.getTotalDonors()).isEqualTo(3);
        assertThat(response.getGoalAmount()).isEqualByComparingTo("800");
        assertThat(response.getProgress()).isEqualByComparingTo("31.25");
    }
}
