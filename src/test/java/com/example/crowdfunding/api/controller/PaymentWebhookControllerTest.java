package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.service.DonationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentWebhookControllerTest {

    @Mock
    private DonationService donationService;

    @InjectMocks
    private PaymentWebhookController controller;

    @Test
    void webhookDelegatesToService() {
        controller.webhook("FAKE", "ext-1", false);

        verify(donationService).handleWebhook("FAKE", "ext-1", false);
    }
}
