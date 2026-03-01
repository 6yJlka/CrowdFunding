package com.example.crowdfunding.api.dto;

import java.util.UUID;

public class PaymentStartResponse {
    private UUID donationId;
    private String provider;
    private String externalPaymentId;
    private String paymentUrl;
    private String status; // PENDING

    public UUID getDonationId() { return donationId; }
    public void setDonationId(UUID donationId) { this.donationId = donationId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getExternalPaymentId() { return externalPaymentId; }
    public void setExternalPaymentId(String externalPaymentId) { this.externalPaymentId = externalPaymentId; }

    public String getPaymentUrl() { return paymentUrl; }
    public void setPaymentUrl(String paymentUrl) { this.paymentUrl = paymentUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}