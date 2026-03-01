package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.DonationCreateRequest;
import com.example.crowdfunding.api.dto.PaymentStartResponse;
import com.example.crowdfunding.service.DonationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationService donationService;

    public DonationController(DonationService donationService) {
        this.donationService = donationService;
    }

    // Спонсор создаёт донат и получает "ссылку на оплату"
    @PostMapping
    public PaymentStartResponse create(
            @RequestHeader("X-User-Id") UUID sponsorId,
            @Valid @RequestBody DonationCreateRequest req
    ) {
        return donationService.createAndStartPayment(sponsorId, req);
    }
}