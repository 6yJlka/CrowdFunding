package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.DonationHistoryService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MyDonationControllerTest {

    @Mock
    private DonationHistoryService donationHistoryService;

    @InjectMocks
    private MyDonationController controller;

    @Test
    void myDonationsMapsPage() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "sponsor@example.com", "hash", List.of());
        var pageable = PageRequest.of(0, 5);

        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setTitle("Project");

        DonationEntity donation = new DonationEntity();
        donation.setId(UUID.randomUUID());
        donation.setProject(project);
        donation.setAmount(BigDecimal.TEN);
        donation.setStatus(ru.donskikh.crowdfunding.domain.enums.DonationStatus.SUCCEEDED);
        donation.setCreatedAt(OffsetDateTime.now());

        when(donationHistoryService.myDonations(userId, pageable)).thenReturn(new PageImpl<>(List.of(donation)));

        var result = controller.myDonations(user, pageable);

        assertThat(result.getContent()).singleElement().satisfies(item -> assertThat(item.getProjectTitle()).isEqualTo("Project"));
    }

    @Test
    void myDonationThrowsWhenMissing() {
        UUID userId = UUID.randomUUID();
        UUID donationId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "sponsor@example.com", "hash", List.of());

        when(donationHistoryService.myDonation(userId, donationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.myDonation(user, donationId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Donation not found: " + donationId);
    }

    @Test
    void myDonationMapsResponseWhenFound() {
        UUID userId = UUID.randomUUID();
        UUID donationId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "sponsor@example.com", "hash", List.of());

        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setTitle("Project");

        DonationEntity donation = new DonationEntity();
        donation.setId(donationId);
        donation.setProject(project);
        donation.setAmount(BigDecimal.ONE);
        donation.setStatus(ru.donskikh.crowdfunding.domain.enums.DonationStatus.PENDING);
        donation.setCreatedAt(OffsetDateTime.now());

        when(donationHistoryService.myDonation(userId, donationId)).thenReturn(Optional.of(donation));

        var response = controller.myDonation(user, donationId);

        assertThat(response.getId()).isEqualTo(donationId);
        assertThat(response.getProjectTitle()).isEqualTo("Project");
    }
}
