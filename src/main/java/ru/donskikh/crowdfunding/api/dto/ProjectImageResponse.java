package ru.donskikh.crowdfunding.api.dto;

public class ProjectImageResponse {

    private final byte[] bytes;
    private final String contentType;

    public ProjectImageResponse(byte[] bytes, String contentType) {
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
