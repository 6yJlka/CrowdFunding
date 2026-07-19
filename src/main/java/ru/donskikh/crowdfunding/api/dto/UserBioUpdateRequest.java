package ru.donskikh.crowdfunding.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserBioUpdateRequest {

    @NotBlank(message = "Bio is required")
    @Size(max = 280, message = "Bio must be 280 characters or fewer")
    private String bio;

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
