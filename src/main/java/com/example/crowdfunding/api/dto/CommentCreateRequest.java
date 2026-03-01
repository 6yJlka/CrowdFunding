package com.example.crowdfunding.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class CommentCreateRequest {

    @NotBlank
    @Size(max = 5000)
    private String content;

    // optional reply-to
    private UUID parentId;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public UUID getParentId() { return parentId; }
    public void setParentId(UUID parentId) { this.parentId = parentId; }
}