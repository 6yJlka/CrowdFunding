package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.CommentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    // Удалить комментарий (владелец или ADMIN)
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{id}")
    public void delete(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable("id") UUID commentId
    ) {
        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        commentService.delete(user.getId(), isAdmin, commentId);
    }
}