package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectCreateRequest;
import com.example.crowdfunding.api.dto.ProjectUpdateRequest;
import com.example.crowdfunding.domain.entity.CategoryEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import jakarta.persistence.EntityNotFoundException;
import com.example.crowdfunding.domain.repository.CategoryRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProjectServiceImpl projectService;

    @Test
    void getCatalogUsesOnlyPublicFundedStatusAndTrimmedQuery() {
        var pageable = PageRequest.of(0, 10);
        UUID authorId = UUID.randomUUID();

        when(projectRepository.findPublicCatalog(List.of(ProjectStatus.FUNDED), "robot", 12L, false, authorId, pageable))
                .thenReturn(new PageImpl<>(List.of()));

        projectService.getCatalog(" robot ", 12L, false, authorId, ProjectStatus.FUNDED, pageable);

        verify(projectRepository).findPublicCatalog(List.of(ProjectStatus.FUNDED), "robot", 12L, false, authorId, pageable);
    }

    @Test
    void createRejectsPastStartDateBeforeSaving() {
        UUID authorId = UUID.randomUUID();
        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectCreateRequest request = new ProjectCreateRequest();
        request.setTitle("Project");
        request.setShortDescription("Short");
        request.setDescription("Description");
        request.setGoalAmount(BigDecimal.valueOf(1000));
        request.setCurrency("RUB");
        request.setStartAt(OffsetDateTime.now().minusDays(1));
        request.setEndAt(OffsetDateTime.now().plusDays(10));

        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));

        assertThatThrownBy(() -> projectService.create(authorId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("startAt must not be in the past");

        verify(projectRepository, never()).save(any(ProjectEntity.class));
    }

    @Test
    void createSavesDraftProjectAndLoadsExpandedResponse() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity author = new UserEntity();
        author.setId(authorId);

        CategoryEntity category = new CategoryEntity();
        category.setId(7L);
        category.setTitle("Tech");

        ProjectCreateRequest request = new ProjectCreateRequest();
        request.setCategoryId(7L);
        request.setTitle("Project");
        request.setShortDescription("Short");
        request.setDescription("Description");
        request.setGoalAmount(BigDecimal.valueOf(1000));
        request.setCurrency("RUB");
        request.setStartAt(OffsetDateTime.now().plusDays(1));
        request.setEndAt(OffsetDateTime.now().plusDays(10));

        ProjectEntity loaded = new ProjectEntity();
        loaded.setId(projectId);
        loaded.setAuthor(author);
        loaded.setCategory(category);
        loaded.setStatus(ProjectStatus.DRAFT);

        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> {
            ProjectEntity project = invocation.getArgument(0);
            project.setId(projectId);
            return project;
        });
        when(projectRepository.findWithAuthorAndCategoryById(projectId)).thenReturn(Optional.of(loaded));

        ProjectEntity response = projectService.create(authorId, request);

        assertThat(response).isEqualTo(loaded);
        ArgumentCaptor<ProjectEntity> captor = ArgumentCaptor.forClass(ProjectEntity.class);
        verify(projectRepository).save(captor.capture());
        ProjectEntity saved = captor.getValue();
        assertThat(saved.getAuthor()).isEqualTo(author);
        assertThat(saved.getCategory()).isEqualTo(category);
        assertThat(saved.getStatus()).isEqualTo(ProjectStatus.DRAFT);
    }

    @Test
    void updateRejectsNonAuthor() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(owner);
        project.setStatus(ProjectStatus.DRAFT);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.update(authorId, projectId, new ProjectUpdateRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only author can update this project");
    }

    @Test
    void updateRejectsInvalidStatus() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.ACTIVE);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.update(authorId, projectId, new ProjectUpdateRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Project can be edited only in DRAFT or REJECTED");
    }

    @Test
    void updateResetsRejectionReasonAndLoadsExpandedResponse() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.REJECTED);
        project.setRejectionReason("Fix it");

        ProjectUpdateRequest request = new ProjectUpdateRequest();
        request.setTitle("Updated");
        request.setShortDescription("Short");
        request.setDescription("Desc");
        request.setGoalAmount(BigDecimal.valueOf(500));
        request.setCurrency("RUB");
        request.setStartAt(OffsetDateTime.now().plusDays(1));
        request.setEndAt(OffsetDateTime.now().plusDays(2));

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.findWithAuthorAndCategoryById(projectId)).thenReturn(Optional.of(project));

        ProjectEntity response = projectService.update(authorId, projectId, request);

        assertThat(response.getTitle()).isEqualTo("Updated");
        assertThat(response.getRejectionReason()).isNull();
    }

    @Test
    void submitToModerationMovesRejectedProjectToModeration() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.REJECTED);
        project.setRejectionReason("Need fixes");

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.findWithAuthorAndCategoryById(projectId)).thenReturn(Optional.of(project));

        ProjectEntity response = projectService.submitToModeration(authorId, projectId);

        assertThat(response.getStatus()).isEqualTo(ProjectStatus.MODERATION);
        assertThat(response.getRejectionReason()).isNull();
    }

    @Test
    void submitToModerationRejectsNonAuthor() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(owner);
        project.setStatus(ProjectStatus.DRAFT);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.submitToModeration(authorId, projectId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only author can submit this project");
    }

    @Test
    void submitToModerationRejectsInvalidStatus() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.ACTIVE);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.submitToModeration(authorId, projectId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Project can be submitted only from DRAFT or REJECTED");
    }

    @Test
    void updateCoverImageNormalizesImageToPng() throws Exception {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);

        BufferedImage sourceImage = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream imageBytes = new ByteArrayOutputStream();
        ImageIO.write(sourceImage, "jpg", imageBytes);

        MultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file",
                "cover.jpg",
                "image/jpeg",
                imageBytes.toByteArray()
        );

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.updateCoverImage(authorId, projectId, file);

        ArgumentCaptor<ProjectEntity> captor = ArgumentCaptor.forClass(ProjectEntity.class);
        verify(projectRepository).save(captor.capture());
        ProjectEntity saved = captor.getValue();
        assertThat(saved.getCoverImageContentType()).isEqualTo("image/png");
        assertThat(saved.getCoverImageBytes()).isNotNull().isNotEmpty();
    }

    @Test
    void updateCoverImageRejectsMissingFile() {
        assertThatThrownBy(() -> projectService.updateCoverImage(UUID.randomUUID(), UUID.randomUUID(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Project image file is required");
    }

    @Test
    void updateCoverImageRejectsNonImageContentType() {
        MultipartFile file = new org.springframework.mock.web.MockMultipartFile("file", "x.txt", "text/plain", new byte[]{1});

        assertThatThrownBy(() -> projectService.updateCoverImage(UUID.randomUUID(), UUID.randomUUID(), file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Project image must be an image");
    }

    @Test
    void updateCoverImageRejectsNonAuthor() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(owner);

        MultipartFile file = new org.springframework.mock.web.MockMultipartFile("file", "cover.png", "image/png", new byte[]{1, 2});

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.updateCoverImage(authorId, projectId, file))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only author can update this project image");
    }

    @Test
    void getCoverImageThrowsWhenMissing() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.getCoverImage(projectId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Project image not found");
    }

    @Test
    void getCoverImageReturnsBinaryPayload() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setCoverImageContentType("image/png");
        project.setCoverImageBytes(new byte[]{1, 2});

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        var response = projectService.getCoverImage(projectId);

        assertThat(response.getContentType()).isEqualTo("image/png");
        assertThat(response.getBytes()).containsExactly(1, 2);
    }

    @Test
    void getCatalogWithoutQueryUsesActiveStatus() {
        var pageable = PageRequest.of(0, 10);
        when(projectRepository.findByStatus(ProjectStatus.ACTIVE, pageable)).thenReturn(new PageImpl<>(List.of()));

        projectService.getCatalog("   ", pageable);

        verify(projectRepository).findByStatus(ProjectStatus.ACTIVE, pageable);
    }

    @Test
    void getCatalogWithQueryUsesTrimmedPrefixSearch() {
        var pageable = PageRequest.of(0, 10);
        when(projectRepository.findByStatusAndTitleStartingWithIgnoreCase(ProjectStatus.ACTIVE, "robot", pageable))
                .thenReturn(new PageImpl<>(List.of()));

        projectService.getCatalog(" robot ", pageable);

        verify(projectRepository).findByStatusAndTitleStartingWithIgnoreCase(ProjectStatus.ACTIVE, "robot", pageable);
    }

    @Test
    void getCatalogWithNonFundedStatusFallsBackToActive() {
        var pageable = PageRequest.of(0, 10);
        when(projectRepository.findPublicCatalog(List.of(ProjectStatus.ACTIVE), null, null, false, null, pageable))
                .thenReturn(new PageImpl<>(List.of()));

        projectService.getCatalog(null, null, false, null, ProjectStatus.MODERATION, pageable);

        verify(projectRepository).findPublicCatalog(List.of(ProjectStatus.ACTIVE), null, null, false, null, pageable);
    }

    @Test
    void approveRejectsInvalidStatus() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.DRAFT);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.approve(projectId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Project can be approved only from MODERATION");
    }

    @Test
    void approveMovesProjectToActive() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.MODERATION);
        project.setRejectionReason("Old");

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.findWithAuthorAndCategoryById(projectId)).thenReturn(Optional.of(project));

        ProjectEntity response = projectService.approve(projectId);

        assertThat(response.getStatus()).isEqualTo(ProjectStatus.ACTIVE);
        assertThat(response.getRejectionReason()).isNull();
    }

    @Test
    void rejectRejectsInvalidStatus() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.DRAFT);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.reject(projectId, "reason"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Project can be rejected only from MODERATION");
    }

    @Test
    void rejectMovesProjectToRejectedAndTrimsReason() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setStatus(ProjectStatus.MODERATION);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.findWithAuthorAndCategoryById(projectId)).thenReturn(Optional.of(project));

        ProjectEntity response = projectService.reject(projectId, "  reason  ");

        assertThat(response.getStatus()).isEqualTo(ProjectStatus.REJECTED);
        assertThat(response.getRejectionReason()).isEqualTo("reason");
    }
}
