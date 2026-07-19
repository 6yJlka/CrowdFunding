package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.api.dto.DonationCreateRequest;
import ru.donskikh.crowdfunding.api.dto.PaymentStartResponse;

import java.util.UUID;

public interface DonationService {
    PaymentStartResponse createAndStartPayment(UUID sponsorId, DonationCreateRequest req);
    void handleWebhook(String provider, String externalPaymentId, boolean success);
}