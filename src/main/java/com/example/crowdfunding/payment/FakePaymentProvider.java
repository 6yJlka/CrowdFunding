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
        String extId = "fake_" + donationId;
        String url = "http://localhost:8080/pay.html?donationId=" + donationId;
        return new PaymentStartResult(extId, url);
    }
}
