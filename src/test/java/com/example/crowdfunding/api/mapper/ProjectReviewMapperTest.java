package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectReviewMapperTest {

    @Test
    void mapsReviewFields() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now();

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setDisplayName("Alice");

        ProjectReviewEntity review = new ProjectReviewEntity();
        review.setId(UUID.randomUUID());
        review.setProject(project);
        review.setUser(user);
        review.setRating((short) 5);
        review.setReviewText("Great");
        review.setCreatedAt(createdAt);

        var response = ProjectReviewMapper.toResponse(review);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getUserDisplayName()).isEqualTo("Alice");
        assertThat(response.getRating()).isEqualTo((short) 5);
        assertThat(response.getReviewText()).isEqualTo("Great");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
    }
}
