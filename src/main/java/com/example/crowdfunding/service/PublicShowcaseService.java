package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.api.dto.UserAvatarResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PublicShowcaseService {

    Page<PublicFounderResponse> getFounders(String q, Pageable pageable);
    UserAvatarResponse getFounderAvatar(UUID authorId);

    Page<PublicSponsorResponse> getSponsors(String q, Pageable pageable);
    UserAvatarResponse getSponsorAvatar(UUID sponsorId);

    Page<PublicReviewFeedResponse> getReviews(String q, Pageable pageable);
}
