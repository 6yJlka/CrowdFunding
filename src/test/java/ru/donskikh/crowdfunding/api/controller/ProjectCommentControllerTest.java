package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.CommentCreateRequest;
import ru.donskikh.crowdfunding.domain.entity.CommentEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.CommentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectCommentControllerTest {

    @Mock
    private CommentService commentService;

    @InjectMocks
    private ProjectCommentController controller;

    @Test
    void createMapsSavedComment() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());

        CommentCreateRequest request = new CommentCreateRequest();
        request.setContent("Hello");

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity author = new UserEntity();
        author.setId(userId);
        author.setDisplayName("Alice");
        CommentEntity comment = new CommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setProject(project);
        comment.setUser(author);
        comment.setContent("Hello");
        comment.setCreatedAt(OffsetDateTime.now());

        when(commentService.create(userId, projectId, request)).thenReturn(comment);

        var response = controller.create(user, projectId, request);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getContent()).isEqualTo("Hello");
    }

    @Test
    void listMapsRepositoryComments() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setDisplayName("Bob");
        CommentEntity comment = new CommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setProject(project);
        comment.setUser(user);
        comment.setContent("Text");
        comment.setCreatedAt(OffsetDateTime.now());

        when(commentService.listByProject(projectId)).thenReturn(List.of(comment));

        var result = controller.list(projectId);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getProjectId()).isEqualTo(projectId);
    }
}
