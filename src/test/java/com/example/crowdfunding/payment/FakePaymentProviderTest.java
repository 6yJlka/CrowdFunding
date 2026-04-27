package com.example.crowdfunding.payment;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FakePaymentProviderTest {

    @Test
    void returnsExpectedProviderNameAndPaymentLink() {
        FakePaymentProvider provider = new FakePaymentProvider();
        UUID donationId = UUID.randomUUID();

        PaymentProvider.PaymentStartResult result = provider.startPayment(donationId, BigDecimal.TEN);

        assertThat(provider.getName()).isEqualTo("FAKE");
        assertThat(result.externalPaymentId()).isEqualTo("fake_" + donationId);
        assertThat(result.paymentUrl()).isEqualTo("/pay.html?donationId=" + donationId);
    }
}
