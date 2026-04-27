package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectReviewRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectReviewService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectReviewControllerTest {

    @Mock
    private ProjectReviewService projectReviewService;

    @InjectMocks
    private ProjectReviewController controller;

    @Test
    void createMapsSavedReview() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "user@example.com", "hash", List.of());

        ProjectReviewRequest request = new ProjectReviewRequest();
        request.setRating((short) 5);
        request.setReviewText("Great");

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity author = new UserEntity();
        author.setId(userId);
        author.setDisplayName("Alice");
        ProjectReviewEntity review = new ProjectReviewEntity();
        review.setId(UUID.randomUUID());
        review.setProject(project);
        review.setUser(author);
        review.setRating((short) 5);
        review.setReviewText("Great");
        review.setCreatedAt(OffsetDateTime.now());

        when(projectReviewService.create(userId, projectId, request)).thenReturn(review);

        var response = controller.create(user, projectId, request);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getRating()).isEqualTo((short) 5);
    }

    @Test
    void getAllMapsReviewList() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setDisplayName("Bob");
        ProjectReviewEntity review = new ProjectReviewEntity();
        review.setId(UUID.randomUUID());
        review.setProject(project);
        review.setUser(user);
        review.setRating((short) 4);
        review.setReviewText("Nice");
        review.setCreatedAt(OffsetDateTime.now());

        when(projectReviewService.getAllByProject(projectId)).thenReturn(List.of(review));

        var result = controller.getAll(projectId);

        assertThat(result).singleElement().satisfies(item -> assertThat(item.getProjectId()).isEqualTo(projectId));
    }
}
