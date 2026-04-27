package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.CommentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentControllerTest {

    @Mock
    private CommentService commentService;

    @InjectMocks
    private CommentController controller;

    @Test
    void deletePassesAdminFlagFromAuthorities() {
        UUID userId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "admin@example.com", "hash", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        controller.delete(user, commentId);

        verify(commentService).delete(userId, true, commentId);
    }
}
