package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.domain.entity.CommentEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.service.CommentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminCommentControllerTest {

    @Mock
    private CommentService commentService;

    @InjectMocks
    private AdminCommentController controller;

    @Test
    void commentsMapsAdminView() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setTitle("Project");
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setDisplayName("Alice");

        CommentEntity comment = new CommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setProject(project);
        comment.setUser(user);
        comment.setContent("Text");
        comment.setDeleted(false);
        comment.setCreatedAt(OffsetDateTime.now());

        when(commentService.listForAdmin("alice", PageRequest.of(0, 5))).thenReturn(new PageImpl<>(List.of(comment)));

        var page = controller.comments("alice", PageRequest.of(0, 5));

        assertThat(page.getContent()).singleElement().satisfies(item -> {
            assertThat(item.getProjectId()).isEqualTo(projectId);
            assertThat(item.getUserId()).isEqualTo(userId);
            assertThat(item.getContent()).isEqualTo("Text");
        });
    }
}
