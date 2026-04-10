package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PublicShowcaseService {

    Page<PublicFounderResponse> getFounders(String q, Pageable pageable);

    Page<PublicSponsorResponse> getSponsors(String q, Pageable pageable);

    Page<PublicReviewFeedResponse> getReviews(String q, Pageable pageable);
}
