package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.UserAvatarResponse;
import com.example.crowdfunding.api.dto.UserBioUpdateRequest;
import com.example.crowdfunding.api.dto.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface UserProfileService {
    UserProfileResponse getCurrentProfile(UUID userId);
    UserAvatarResponse getCurrentAvatar(UUID userId);
    UserProfileResponse updateBio(UUID userId, UserBioUpdateRequest request);
    void updateAvatar(UUID userId, MultipartFile file);
}
