package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.DonationCreateRequest;
import com.example.crowdfunding.api.dto.PaymentStartResponse;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.DonationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationService donationService;

    public DonationController(DonationService donationService) {
        this.donationService = donationService;
    }

    // Спонсор создаёт донат и получает "ссылку на оплату"
    @PreAuthorize("hasRole('SPONSOR')")
    @PostMapping
    public PaymentStartResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody DonationCreateRequest req
    ) {
        return donationService.createAndStartPayment(user.getId(), req);
    }
}