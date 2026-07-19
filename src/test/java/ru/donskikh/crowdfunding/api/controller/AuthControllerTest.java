package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.AuthResponse;
import ru.donskikh.crowdfunding.api.dto.LoginRequest;
import ru.donskikh.crowdfunding.api.dto.RegisterRequest;
import ru.donskikh.crowdfunding.api.dto.UserProfileResponse;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.AuthService;
import ru.donskikh.crowdfunding.service.UserProfileService;
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
class AuthControllerTest {

    @Mock
    private AuthService authService;
    @Mock
    private UserProfileService userProfileService;

    @InjectMocks
    private AuthController controller;

    @Test
    void registerDelegatesToService() {
        RegisterRequest request = new RegisterRequest();
        AuthResponse response = new AuthResponse("token");
        when(authService.register(request)).thenReturn(response);

        assertThat(controller.register(request)).isEqualTo(response);
    }

    @Test
    void loginDelegatesToService() {
        LoginRequest request = new LoginRequest();
        AuthResponse response = new AuthResponse("token");
        when(authService.login(request)).thenReturn(response);

        assertThat(controller.login(request)).isEqualTo(response);
    }

    @Test
    void meLoadsCurrentProfile() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());
        UserProfileResponse profile = new UserProfileResponse();
        profile.setId(userId);
        when(userProfileService.getCurrentProfile(userId)).thenReturn(profile);

        assertThat(controller.me(user)).isEqualTo(profile);
    }
}
