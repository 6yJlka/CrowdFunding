package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import ru.donskikh.crowdfunding.domain.repository.DonationRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DonationHistoryServiceImplTest {

    @Mock
    private DonationRepository donationRepository;
    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private DonationHistoryServiceImpl service;

    @Test
    void myDonationsDelegatesToRepository() {
        UUID sponsorId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);
        var page = new PageImpl<>(List.of(new DonationEntity()));
        when(donationRepository.findBySponsorIdOrderByCreatedAtDesc(sponsorId, pageable)).thenReturn(page);

        assertThat(service.myDonations(sponsorId, pageable)).isEqualTo(page);
    }

    @Test
    void myDonationDelegatesToRepository() {
        UUID sponsorId = UUID.randomUUID();
        UUID donationId = UUID.randomUUID();
        DonationEntity donation = new DonationEntity();
        when(donationRepository.findByIdAndSponsorId(donationId, sponsorId)).thenReturn(Optional.of(donation));

        assertThat(service.myDonation(sponsorId, donationId)).contains(donation);
    }

    @Test
    void publicProjectDonationsUsesSucceededStatus() {
        UUID projectId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);
        var page = new PageImpl<>(List.of(new DonationEntity()));
        when(donationRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, DonationStatus.SUCCEEDED, pageable)).thenReturn(page);

        assertThat(service.publicProjectDonations(projectId, pageable)).isEqualTo(page);
        verify(donationRepository).findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, DonationStatus.SUCCEEDED, pageable);
    }

    @Test
    void projectDonationsRejectsMissingProject() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.projectDonations(UUID.randomUUID(), false, projectId, PageRequest.of(0, 5)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Project not found: " + projectId);
    }

    @Test
    void projectDonationsRejectsNonOwnerNonAdmin() {
        UUID requesterId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity author = new UserEntity();
        author.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.projectDonations(requesterId, false, projectId, PageRequest.of(0, 5)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only project author or admin can view donations");
    }

    @Test
    void projectDonationsAllowsAuthor() {
        UUID requesterId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);

        UserEntity author = new UserEntity();
        author.setId(requesterId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);

        var page = new PageImpl<>(List.of(new DonationEntity()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(donationRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable)).thenReturn(page);

        assertThat(service.projectDonations(requesterId, false, projectId, pageable)).isEqualTo(page);
    }

    @Test
    void projectDonationsAllowsAdmin() {
        UUID requesterId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);

        UserEntity author = new UserEntity();
        author.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);

        var page = new PageImpl<>(List.of(new DonationEntity()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(donationRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable)).thenReturn(page);

        assertThat(service.projectDonations(requesterId, true, projectId, pageable)).isEqualTo(page);
    }
}
