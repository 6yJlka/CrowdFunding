package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.DonationHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectDonationControllerTest {

    @Mock
    private DonationHistoryService donationHistoryService;

    @InjectMocks
    private ProjectDonationController controller;

    @Test
    void publicProjectDonationsMapsPage() {
        UUID projectId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);

        DonationEntity donation = new DonationEntity();
        donation.setId(UUID.randomUUID());
        donation.setSponsor(new UserEntity());
        donation.getSponsor().setId(UUID.randomUUID());
        donation.getSponsor().setDisplayName("Donor");
        donation.setAmount(java.math.BigDecimal.TEN);
        donation.setStatus(com.example.crowdfunding.domain.enums.DonationStatus.SUCCEEDED);
        donation.setCreatedAt(OffsetDateTime.now());

        when(donationHistoryService.publicProjectDonations(projectId, pageable)).thenReturn(new PageImpl<>(List.of(donation)));

        var result = controller.publicProjectDonations(projectId, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().getSponsorDisplayName()).isEqualTo("Donor");
    }

    @Test
    void projectDonationsPassesAdminFlag() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        var pageable = PageRequest.of(0, 5);
        AppUserDetails user = new AppUserDetails(userId, "admin@example.com", "hash", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        when(donationHistoryService.projectDonations(userId, true, projectId, pageable)).thenReturn(new PageImpl<>(List.of()));

        controller.projectDonations(user, projectId, pageable);

        verify(donationHistoryService).projectDonations(userId, true, projectId, pageable);
    }
}
