package com.example.crowdfunding.api.dto;

public class UserAvatarResponse {

    private final byte[] bytes;
    private final String contentType;

    public UserAvatarResponse(byte[] bytes, String contentType) {
        this.bytes = bytes;
        this.contentType = contentType;
    }

    public byte[] getBytes() {
        return bytes;
    }

    public String getContentType() {
        return contentType;
    }
}
