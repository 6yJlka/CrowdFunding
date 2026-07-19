package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.CommentCreateRequest;
import ru.donskikh.crowdfunding.api.dto.CommentResponse;
import ru.donskikh.crowdfunding.api.mapper.CommentMapper;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.CommentService;
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

    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public CommentResponse create(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            @Valid @RequestBody CommentCreateRequest req
    ) {
        return CommentMapper.toResponse(commentService.create(user.getId(), projectId, req));
    }

    @GetMapping
    public List<CommentResponse> list(@PathVariable UUID projectId) {
        return commentService.listByProject(projectId).stream()
                .map(CommentMapper::toResponse)
                .toList();
    }
}
