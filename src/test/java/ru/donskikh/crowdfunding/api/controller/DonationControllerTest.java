package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.DonationCreateRequest;
import ru.donskikh.crowdfunding.api.dto.PaymentStartResponse;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.DonationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DonationControllerTest {

    @Mock
    private DonationService donationService;

    @InjectMocks
    private DonationController controller;

    @Test
    void createDelegatesToService() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "sponsor@example.com", "hash", List.of());
        DonationCreateRequest request = new DonationCreateRequest();
        PaymentStartResponse response = new PaymentStartResponse();
        response.setStatus("PENDING");
        when(donationService.createAndStartPayment(userId, request)).thenReturn(response);

        assertThat(controller.create(user, request)).isEqualTo(response);
    }
}
