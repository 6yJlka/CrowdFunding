package com.example.crowdfunding.payment;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentProvider {

    String getName();

    PaymentStartResult startPayment(UUID donationId, BigDecimal amount);

    record PaymentStartResult(String externalPaymentId, String paymentUrl) {}
}