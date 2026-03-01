package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.api.dto.CommentResponse;
import com.example.crowdfunding.domain.entity.CommentEntity;

public class CommentMapper {

    public static CommentResponse toResponse(CommentEntity e) {
        CommentResponse r = new CommentResponse();
        r.setId(e.getId());
        r.setProjectId(e.getProject().getId());
        r.setUserId(e.getUser().getId());
        r.setUserDisplayName(e.getUser().getDisplayName());
        r.setParentId(e.getParent() == null ? null : e.getParent().getId());
        r.setDeleted(e.isDeleted());
        r.setCreatedAt(e.getCreatedAt());

        // если удалён — прячем контент
        r.setContent(e.isDeleted() ? null : e.getContent());
        return r;
    }
}