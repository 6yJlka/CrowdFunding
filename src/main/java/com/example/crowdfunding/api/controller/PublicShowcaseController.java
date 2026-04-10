package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.service.PublicShowcaseService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase")
public class PublicShowcaseController {

    private final PublicShowcaseService publicShowcaseService;

    public PublicShowcaseController(PublicShowcaseService publicShowcaseService) {
        this.publicShowcaseService = publicShowcaseService;
    }

    @GetMapping("/founders")
    public Page<PublicFounderResponse> founders(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getFounders(q, pageable);
    }

    @GetMapping("/sponsors")
    public Page<PublicSponsorResponse> sponsors(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getSponsors(q, pageable);
    }

    @GetMapping("/reviews")
    public Page<PublicReviewFeedResponse> reviews(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getReviews(q, pageable);
    }
}
