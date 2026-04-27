package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.domain.entity.CommentEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CommentMapperTest {

    @Test
    void hidesContentForDeletedCommentAndKeepsParentId() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now();

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setDisplayName("Alice");

        CommentEntity parent = new CommentEntity();
        parent.setId(parentId);

        CommentEntity comment = new CommentEntity();
        comment.setId(UUID.randomUUID());
        comment.setProject(project);
        comment.setUser(user);
        comment.setParent(parent);
        comment.setDeleted(true);
        comment.setContent("Hidden");
        comment.setCreatedAt(createdAt);

        var response = CommentMapper.toResponse(comment);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getUserDisplayName()).isEqualTo("Alice");
        assertThat(response.getParentId()).isEqualTo(parentId);
        assertThat(response.isDeleted()).isTrue();
        assertThat(response.getContent()).isNull();
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
    }
}
