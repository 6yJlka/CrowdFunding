package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectReviewRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectReviewRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectReviewServiceImplTest {

    @Mock
    private ProjectReviewRepository projectReviewRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProjectReviewServiceImpl service;

    @Test
    void createRejectsProjectAuthorReview() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(userId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(user);

        ProjectReviewRequest request = new ProjectReviewRequest();
        request.setRating((short) 5);
        request.setReviewText("Great");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.create(userId, projectId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Project authors cannot post reviews for their own projects");
    }

    @Test
    void createRejectsDuplicateReview() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(userId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(new UserEntity());

        ProjectReviewRequest request = new ProjectReviewRequest();
        request.setRating((short) 5);
        request.setReviewText("Great");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectReviewRepository.existsByProjectIdAndUserId(projectId, userId)).thenReturn(true);

        assertThatThrownBy(() -> service.create(userId, projectId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("You have already posted a review for this project");
    }

    @Test
    void createSavesReview() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(userId);

        UserEntity author = new UserEntity();
        author.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);

        ProjectReviewRequest request = new ProjectReviewRequest();
        request.setRating((short) 4);
        request.setReviewText("Nice");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectReviewRepository.existsByProjectIdAndUserId(projectId, userId)).thenReturn(false);
        when(projectReviewRepository.save(any(ProjectReviewEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectReviewEntity review = service.create(userId, projectId, request);

        assertThat(review.getProject()).isEqualTo(project);
        assertThat(review.getUser()).isEqualTo(user);
        assertThat(review.getRating()).isEqualTo((short) 4);
        assertThat(review.getReviewText()).isEqualTo("Nice");
    }

    @Test
    void getAllByProjectRequiresExistingProject() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.existsById(projectId)).thenReturn(false);

        assertThatThrownBy(() -> service.getAllByProject(projectId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Project not found: " + projectId);
    }

    @Test
    void getAllByProjectReturnsRepositoryData() {
        UUID projectId = UUID.randomUUID();
        ProjectReviewEntity review = new ProjectReviewEntity();

        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(projectReviewRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(review));

        assertThat(service.getAllByProject(projectId)).containsExactly(review);
        verify(projectReviewRepository).findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}
