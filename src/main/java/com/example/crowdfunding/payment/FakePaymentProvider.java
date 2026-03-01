package com.example.crowdfunding.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class FakePaymentProvider implements PaymentProvider {

    @Override
    public String getName() {
        return "FAKE";
    }

    @Override
    public PaymentStartResult startPayment(UUID donationId, BigDecimal amount) {
        // имитируем внешний id и "страницу оплаты"
        String extId = "fake_" + donationId;
        String url = "http://localhost:8080/pay/fake/" + donationId; // можно будет сделать страничку позже
        return new PaymentStartResult(extId, url);
    }
}