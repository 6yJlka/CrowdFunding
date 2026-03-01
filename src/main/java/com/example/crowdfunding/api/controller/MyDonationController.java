package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.MyDonationResponse;
import com.example.crowdfunding.api.mapper.DonationHistoryMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.DonationHistoryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/donations")
public class MyDonationController {

    private final DonationHistoryService donationHistoryService;

    public MyDonationController(DonationHistoryService donationHistoryService) {
        this.donationHistoryService = donationHistoryService;
    }

    @PreAuthorize("hasRole('SPONSOR')")
    @GetMapping
    public Page<MyDonationResponse> myDonations(
            @AuthenticationPrincipal AppUserDetails user,
            Pageable pageable
    ) {
        return donationHistoryService.myDonations(user.getId(), pageable)
                .map(DonationHistoryMapper::toMy);
    }
}