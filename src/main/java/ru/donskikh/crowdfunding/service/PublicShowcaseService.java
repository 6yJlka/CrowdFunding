package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.PublicFounderResponse;
import ru.donskikh.crowdfunding.api.dto.PublicReviewFeedResponse;
import ru.donskikh.crowdfunding.api.dto.PublicSponsorResponse;
import ru.donskikh.crowdfunding.api.dto.UserAvatarResponse;
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
