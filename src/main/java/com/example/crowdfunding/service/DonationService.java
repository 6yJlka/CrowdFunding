package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.DonationCreateRequest;
import com.example.crowdfunding.api.dto.PaymentStartResponse;

import java.util.UUID;

public interface DonationService {
    PaymentStartResponse createAndStartPayment(UUID sponsorId, DonationCreateRequest req);
    void handleWebhook(String provider, String externalPaymentId, boolean success);
}