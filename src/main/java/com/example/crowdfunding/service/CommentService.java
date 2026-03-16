package com.example.crowdfunding.service;

import com.example.crowdfunding.api.dto.CommentCreateRequest;
import com.example.crowdfunding.domain.entity.CommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CommentService {
    CommentEntity create(UUID userId, UUID projectId, CommentCreateRequest req);
    List<CommentEntity> listByProject(UUID projectId);
    Page<CommentEntity> listForAdmin(String q, Pageable pageable);
    void delete(UUID requesterId, boolean requesterIsAdmin, UUID commentId);
}
