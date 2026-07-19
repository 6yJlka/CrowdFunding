package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.DonationCreateRequest;
import ru.donskikh.crowdfunding.api.dto.PaymentStartResponse;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.DonationService;
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

    @PreAuthorize("hasRole('SPONSOR')")
    @PostMapping
    public PaymentStartResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody DonationCreateRequest req
    ) {
        return donationService.createAndStartPayment(user.getId(), req);
    }
}
