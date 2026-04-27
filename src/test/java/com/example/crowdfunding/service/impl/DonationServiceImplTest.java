package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.DonationCreateRequest;
import com.example.crowdfunding.api.dto.PaymentStartResponse;
import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.payment.PaymentProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DonationServiceImplTest {

    @Mock
    private DonationRepository donationRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PaymentProvider paymentProvider;

    @InjectMocks
    private DonationServiceImpl donationService;

    @Test
    void createAndStartPaymentPersistsExternalPaymentIdAndReturnsResponse() {
        UUID sponsorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID donationId = UUID.randomUUID();

        UserEntity sponsor = new UserEntity();
        sponsor.setId(sponsorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCollectedAmount(BigDecimal.ZERO);
        project.setGoalAmount(BigDecimal.valueOf(1000));

        DonationCreateRequest request = new DonationCreateRequest();
        request.setProjectId(projectId);
        request.setAmount(BigDecimal.valueOf(250));

        when(userRepository.findById(sponsorId)).thenReturn(Optional.of(sponsor));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(paymentProvider.getName()).thenReturn("FAKE");
        when(donationRepository.save(any(DonationEntity.class))).thenAnswer(invocation -> {
            DonationEntity donation = invocation.getArgument(0);
            if (donation.getId() == null) {
                donation.setId(donationId);
            }
            return donation;
        });
        when(paymentProvider.startPayment(donationId, BigDecimal.valueOf(250)))
                .thenReturn(new PaymentProvider.PaymentStartResult("ext-123", "https://pay.local/123"));

        PaymentStartResponse response = donationService.createAndStartPayment(sponsorId, request);

        assertThat(response.getDonationId()).isEqualTo(donationId);
        assertThat(response.getProvider()).isEqualTo("FAKE");
        assertThat(response.getExternalPaymentId()).isEqualTo("ext-123");
        assertThat(response.getPaymentUrl()).isEqualTo("https://pay.local/123");
        assertThat(response.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void createAndStartPaymentRejectsNonActiveProject() {
        UUID sponsorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity sponsor = new UserEntity();
        sponsor.setId(sponsorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.MODERATION);

        DonationCreateRequest request = new DonationCreateRequest();
        request.setProjectId(projectId);
        request.setAmount(BigDecimal.TEN);

        when(userRepository.findById(sponsorId)).thenReturn(Optional.of(sponsor));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> donationService.createAndStartPayment(sponsorId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Donations allowed only for ACTIVE projects");
    }

    @Test
    void handleWebhookSuccessMarksDonationSucceededAndFundsProjectWhenGoalReached() {
        ProjectEntity project = new ProjectEntity();
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCollectedAmount(BigDecimal.valueOf(900));
        project.setGoalAmount(BigDecimal.valueOf(1000));

        DonationEntity donation = new DonationEntity();
        donation.setProject(project);
        donation.setAmount(BigDecimal.valueOf(100));
        donation.setStatus(DonationStatus.PENDING);
        donation.setProvider("FAKE");
        donation.setExternalPaymentId("ext-123");

        when(donationRepository.findByProviderAndExternalPaymentId("FAKE", "ext-123"))
                .thenReturn(Optional.of(donation));

        donationService.handleWebhook("FAKE", "ext-123", true);

        assertThat(donation.getStatus()).isEqualTo(DonationStatus.SUCCEEDED);
        assertThat(donation.getConfirmedAt()).isNotNull();
        assertThat(project.getCollectedAmount()).isEqualByComparingTo("1000");
        assertThat(project.getStatus()).isEqualTo(ProjectStatus.FUNDED);
        verify(projectRepository).save(project);
    }

    @Test
    void handleWebhookFailureMarksDonationFailedWithoutUpdatingProject() {
        ProjectEntity project = new ProjectEntity();
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCollectedAmount(BigDecimal.valueOf(100));
        project.setGoalAmount(BigDecimal.valueOf(1000));

        DonationEntity donation = new DonationEntity();
        donation.setProject(project);
        donation.setAmount(BigDecimal.valueOf(50));
        donation.setStatus(DonationStatus.PENDING);

        when(donationRepository.findByProviderAndExternalPaymentId("FAKE", "ext-404"))
                .thenReturn(Optional.of(donation));

        donationService.handleWebhook("FAKE", "ext-404", false);

        assertThat(donation.getStatus()).isEqualTo(DonationStatus.FAILED);
        verify(projectRepository, never()).save(any(ProjectEntity.class));
    }
}
