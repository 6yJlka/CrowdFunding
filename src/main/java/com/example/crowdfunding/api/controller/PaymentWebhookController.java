package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.service.DonationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentWebhookController {

    private final DonationService donationService;

    public PaymentWebhookController(DonationService donationService) {
        this.donationService = donationService;
    }

    // DEMO webhook: /api/payments/webhook/FAKE/{externalPaymentId}?success=true
    @PostMapping("/webhook/{provider}/{externalPaymentId}")
    public void webhook(@PathVariable String provider,
                        @PathVariable String externalPaymentId,
                        @RequestParam(defaultValue = "true") boolean success) {
        donationService.handleWebhook(provider, externalPaymentId, success);
    }
}