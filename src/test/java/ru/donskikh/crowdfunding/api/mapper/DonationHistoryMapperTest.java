package ru.donskikh.crowdfunding.api.mapper;

import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DonationHistoryMapperTest {

    @Test
    void mapsDonationForSponsorHistory() {
        OffsetDateTime createdAt = OffsetDateTime.now();
        OffsetDateTime confirmedAt = createdAt.plusMinutes(2);
        UUID donationId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setTitle("Robot");
        project.setCoverImageContentType("image/png");

        DonationEntity donation = new DonationEntity();
        donation.setId(donationId);
        donation.setProject(project);
        donation.setAmount(BigDecimal.valueOf(150));
        donation.setStatus(DonationStatus.SUCCEEDED);
        donation.setProvider("FAKE");
        donation.setExternalPaymentId("ext-1");
        donation.setCreatedAt(createdAt);
        donation.setConfirmedAt(confirmedAt);

        var response = DonationHistoryMapper.toMy(donation);

        assertThat(response.getId()).isEqualTo(donationId);
        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getProjectTitle()).isEqualTo("Robot");
        assertThat(response.isHasProjectCoverImage()).isTrue();
        assertThat(response.getAmount()).isEqualByComparingTo("150");
        assertThat(response.getStatus()).isEqualTo("SUCCEEDED");
        assertThat(response.getProvider()).isEqualTo("FAKE");
        assertThat(response.getExternalPaymentId()).isEqualTo("ext-1");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
        assertThat(response.getConfirmedAt()).isEqualTo(confirmedAt);
    }

    @Test
    void mapsDonationForProjectView() {
        OffsetDateTime createdAt = OffsetDateTime.now();
        UUID sponsorId = UUID.randomUUID();

        UserEntity sponsor = new UserEntity();
        sponsor.setId(sponsorId);
        sponsor.setDisplayName("Bob");

        DonationEntity donation = new DonationEntity();
        donation.setId(UUID.randomUUID());
        donation.setSponsor(sponsor);
        donation.setAmount(BigDecimal.valueOf(75));
        donation.setStatus(DonationStatus.PENDING);
        donation.setCreatedAt(createdAt);

        var response = DonationHistoryMapper.toProject(donation);

        assertThat(response.getSponsorId()).isEqualTo(sponsorId);
        assertThat(response.getSponsorDisplayName()).isEqualTo("Bob");
        assertThat(response.getAmount()).isEqualByComparingTo("75");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
    }
}
