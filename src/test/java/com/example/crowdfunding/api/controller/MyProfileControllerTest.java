package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.UserAvatarResponse;
import com.example.crowdfunding.api.dto.UserBioUpdateRequest;
import com.example.crowdfunding.api.dto.UserProfileResponse;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.UserProfileService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MyProfileControllerTest {

    @Mock
    private UserProfileService userProfileService;

    @InjectMocks
    private MyProfileController controller;

    @Test
    void profileDelegatesToService() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());
        UserProfileResponse profile = new UserProfileResponse();
        profile.setId(userId);
        when(userProfileService.getCurrentProfile(userId)).thenReturn(profile);

        assertThat(controller.profile(user)).isEqualTo(profile);
    }

    @Test
    void updateProfileDelegatesToService() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());
        UserBioUpdateRequest request = new UserBioUpdateRequest();
        request.setBio("Bio");
        UserProfileResponse profile = new UserProfileResponse();
        profile.setBio("Bio");
        when(userProfileService.updateBio(userId, request)).thenReturn(profile);

        assertThat(controller.updateProfile(user, request)).isEqualTo(profile);
    }

    @Test
    void avatarBuildsInlineResponse() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());
        when(userProfileService.getCurrentAvatar(userId)).thenReturn(new UserAvatarResponse(new byte[]{7}, "image/png"));

        var response = controller.avatar(user);

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo("inline");
        assertThat(response.getBody()).containsExactly(7);
    }

    @Test
    void updateAvatarReturnsNoContent() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());
        MockMultipartFile file = new MockMultipartFile("avatar", "a.png", "image/png", new byte[]{1});

        var response = controller.updateAvatar(user, file);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(userProfileService).updateAvatar(userId, file);
    }
}
