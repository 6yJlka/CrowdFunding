package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.CommentCreateRequest;
import com.example.crowdfunding.domain.entity.CommentEntity;

import java.util.List;
import java.util.UUID;

public interface CommentService {
    CommentEntity create(UUID userId, UUID projectId, CommentCreateRequest req);
    List<CommentEntity> listByProject(UUID projectId);
    void delete(UUID requesterId, boolean requesterIsAdmin, UUID commentId);
}