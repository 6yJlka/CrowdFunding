package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.api.dto.UserAvatarResponse;
import com.example.crowdfunding.service.PublicShowcaseService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicShowcaseControllerTest {

    @Mock
    private PublicShowcaseService service;

    @InjectMocks
    private PublicShowcaseController controller;

    @Test
    void foundersDelegatesToService() {
        var pageable = PageRequest.of(0, 5);
        var founder = new PublicFounderResponse(UUID.randomUUID(), "Alice", 2, BigDecimal.TEN, OffsetDateTime.now(), true);
        var page = new PageImpl<>(List.of(founder));
        when(service.getFounders("alice", pageable)).thenReturn(page);

        assertThat(controller.founders("alice", pageable)).isEqualTo(page);
    }

    @Test
    void founderAvatarBuildsInlineResponse() {
        UUID id = UUID.randomUUID();
        when(service.getFounderAvatar(id)).thenReturn(new UserAvatarResponse(new byte[]{1, 2}, "image/png"));

        var response = controller.founderAvatar(id);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo("inline");
        assertThat(response.getBody()).containsExactly(1, 2);
    }

    @Test
    void sponsorsDelegatesToService() {
        var pageable = PageRequest.of(0, 5);
        var sponsor = new PublicSponsorResponse(UUID.randomUUID(), "Bob", 1, BigDecimal.ONE, OffsetDateTime.now(), false);
        var page = new PageImpl<>(List.of(sponsor));
        when(service.getSponsors("bob", pageable)).thenReturn(page);

        assertThat(controller.sponsors("bob", pageable)).isEqualTo(page);
    }

    @Test
    void sponsorAvatarBuildsInlineResponse() {
        UUID id = UUID.randomUUID();
        when(service.getSponsorAvatar(id)).thenReturn(new UserAvatarResponse(new byte[]{9}, "image/jpeg"));

        var response = controller.sponsorAvatar(id);

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
        assertThat(response.getBody()).containsExactly(9);
    }

    @Test
    void reviewsDelegatesToService() {
        var pageable = PageRequest.of(0, 5);
        var review = new PublicReviewFeedResponse(UUID.randomUUID(), UUID.randomUUID(), "Project", "User", (short) 5, "Great", OffsetDateTime.now());
        var page = new PageImpl<>(List.of(review));
        when(service.getReviews("great", pageable)).thenReturn(page);

        assertThat(controller.reviews("great", pageable)).isEqualTo(page);
        verify(service).getReviews("great", pageable);
    }
}
