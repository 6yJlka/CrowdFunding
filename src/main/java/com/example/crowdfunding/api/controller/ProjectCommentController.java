package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.CommentCreateRequest;
import com.example.crowdfunding.api.dto.CommentResponse;
import com.example.crowdfunding.api.mapper.CommentMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/comments")
public class ProjectCommentController {

    private final CommentService commentService;

    public ProjectCommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    // Написать комментарий (любая роль, но нужен логин)
    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public CommentResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody CommentCreateRequest req
    ) {
        return CommentMapper.toResponse(commentService.create(user.getId(), projectId, req));
    }

    // Список комментариев (публично)
    @GetMapping
    public List<CommentResponse> list(@PathVariable UUID projectId) {
        return commentService.listByProject(projectId).stream()
                .map(CommentMapper::toResponse)
                .toList();
    }
}