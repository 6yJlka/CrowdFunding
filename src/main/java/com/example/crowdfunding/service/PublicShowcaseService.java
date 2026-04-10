package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PublicShowcaseService {

    Page<PublicSponsorResponse> getSponsors(String q, Pageable pageable);

    Page<PublicReviewFeedResponse> getReviews(String q, Pageable pageable);
}
