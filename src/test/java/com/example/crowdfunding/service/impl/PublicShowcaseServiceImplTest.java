package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectReviewRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicShowcaseServiceImplTest {

    @Mock
    private DonationRepository donationRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectReviewRepository projectReviewRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PublicShowcaseServiceImpl service;

    @Test
    void getFoundersTrimsQuery() {
        var pageable = PageRequest.of(0, 5);
        var founder = new PublicFounderResponse(UUID.randomUUID(), "Alice", 2, BigDecimal.TEN, OffsetDateTime.now(), true);
        when(projectRepository.findPublicFounders(
                List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED),
                UserStatus.ACTIVE,
                RoleCode.AUTHOR,
                "alice",
                pageable
        )).thenReturn(new PageImpl<>(List.of(founder)));

        var page = service.getFounders(" alice ", pageable);

        assertThat(page.getContent()).containsExactly(founder);
        verify(projectRepository).findPublicFounders(List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), UserStatus.ACTIVE, RoleCode.AUTHOR, "alice", pageable);
    }

    @Test
    void getFounderAvatarRejectsNonPublicFounder() {
        UUID authorId = UUID.randomUUID();
        when(projectRepository.existsPublicFounder(authorId, List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), UserStatus.ACTIVE, RoleCode.AUTHOR))
                .thenReturn(false);

        assertThatThrownBy(() -> service.getFounderAvatar(authorId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Founder not found");
    }

    @Test
    void getFounderAvatarReturnsBinaryPayload() {
        UUID authorId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(authorId);
        user.setAvatarContentType("image/png");
        user.setAvatarBytes(new byte[]{1, 2, 3});

        when(projectRepository.existsPublicFounder(authorId, List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), UserStatus.ACTIVE, RoleCode.AUTHOR))
                .thenReturn(true);
        when(userRepository.findById(authorId)).thenReturn(Optional.of(user));

        var avatar = service.getFounderAvatar(authorId);

        assertThat(avatar.getContentType()).isEqualTo("image/png");
        assertThat(avatar.getBytes()).containsExactly(1, 2, 3);
    }

    @Test
    void getSponsorsTrimsQuery() {
        var pageable = PageRequest.of(0, 5);
        var sponsor = new PublicSponsorResponse(UUID.randomUUID(), "Bob", 1, BigDecimal.ONE, OffsetDateTime.now(), false);
        when(donationRepository.findPublicSponsors(DonationStatus.SUCCEEDED, UserStatus.ACTIVE, RoleCode.SPONSOR, "bob", pageable))
                .thenReturn(new PageImpl<>(List.of(sponsor)));

        var page = service.getSponsors(" bob ", pageable);

        assertThat(page.getContent()).containsExactly(sponsor);
        verify(donationRepository).findPublicSponsors(DonationStatus.SUCCEEDED, UserStatus.ACTIVE, RoleCode.SPONSOR, "bob", pageable);
    }

    @Test
    void getSponsorAvatarRejectsNonPublicSponsor() {
        UUID sponsorId = UUID.randomUUID();
        when(donationRepository.existsPublicSponsor(sponsorId, DonationStatus.SUCCEEDED, List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), UserStatus.ACTIVE, RoleCode.SPONSOR))
                .thenReturn(false);

        assertThatThrownBy(() -> service.getSponsorAvatar(sponsorId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Sponsor not found");
    }

    @Test
    void getSponsorAvatarReturnsBinaryPayload() {
        UUID sponsorId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(sponsorId);
        user.setAvatarContentType("image/jpeg");
        user.setAvatarBytes(new byte[]{9, 8});

        when(donationRepository.existsPublicSponsor(sponsorId, DonationStatus.SUCCEEDED, List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), UserStatus.ACTIVE, RoleCode.SPONSOR))
                .thenReturn(true);
        when(userRepository.findById(sponsorId)).thenReturn(Optional.of(user));

        var avatar = service.getSponsorAvatar(sponsorId);

        assertThat(avatar.getContentType()).isEqualTo("image/jpeg");
        assertThat(avatar.getBytes()).containsExactly(9, 8);
    }

    @Test
    void getReviewsTrimsQuery() {
        var pageable = PageRequest.of(0, 5);
        var review = new PublicReviewFeedResponse(UUID.randomUUID(), UUID.randomUUID(), "Project", "Alice", (short) 5, "Great", OffsetDateTime.now());
        when(projectReviewRepository.findPublicReviewFeed(List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), "great", pageable))
                .thenReturn(new PageImpl<>(List.of(review)));

        var page = service.getReviews(" great ", pageable);

        assertThat(page.getContent()).containsExactly(review);
        verify(projectReviewRepository).findPublicReviewFeed(List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED), "great", pageable);
    }
}
