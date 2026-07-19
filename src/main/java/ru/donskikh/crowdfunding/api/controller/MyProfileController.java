package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.UserAvatarResponse;
import ru.donskikh.crowdfunding.api.dto.UserBioUpdateRequest;
import ru.donskikh.crowdfunding.api.dto.UserProfileResponse;
import jakarta.validation.Valid;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.UserProfileService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/me")
public class MyProfileController {

    private final UserProfileService userProfileService;

    public MyProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/profile")
    public UserProfileResponse profile(@AuthenticationPrincipal AppUserDetails user) {
        return userProfileService.getCurrentProfile(user.getId());
    }

    @PatchMapping("/profile")
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody UserBioUpdateRequest request
    ) {
        return userProfileService.updateBio(user.getId(), request);
    }

    @GetMapping("/avatar")
    public ResponseEntity<byte[]> avatar(@AuthenticationPrincipal AppUserDetails user) {
        UserAvatarResponse avatar = userProfileService.getCurrentAvatar(user.getId());
        MediaType mediaType = MediaType.parseMediaType(avatar.getContentType());

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(avatar.getBytes());
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> updateAvatar(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam("avatar") MultipartFile avatar
    ) {
        userProfileService.updateAvatar(user.getId(), avatar);
        return ResponseEntity.noContent().build();
    }
}
