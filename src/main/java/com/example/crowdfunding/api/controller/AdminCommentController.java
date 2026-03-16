package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.AdminCommentResponse;
import com.example.crowdfunding.domain.entity.CommentEntity;
import com.example.crowdfunding.service.CommentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/comments")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommentController {

    private final CommentService commentService;

    public AdminCommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public Page<AdminCommentResponse> comments(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return commentService.listForAdmin(q, pageable).map(this::toResponse);
    }

    private AdminCommentResponse toResponse(CommentEntity comment) {
        AdminCommentResponse response = new AdminCommentResponse();
        response.setId(comment.getId());
        response.setProjectId(comment.getProject().getId());
        response.setProjectTitle(comment.getProject().getTitle());
        response.setUserId(comment.getUser().getId());
        response.setUserDisplayName(comment.getUser().getDisplayName());
        response.setContent(comment.getContent());
        response.setDeleted(comment.isDeleted());
        response.setCreatedAt(comment.getCreatedAt());
        return response;
    }
}
