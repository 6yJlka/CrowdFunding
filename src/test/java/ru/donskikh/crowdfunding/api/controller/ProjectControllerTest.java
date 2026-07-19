package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectCreateRequest;
import ru.donskikh.crowdfunding.api.dto.ProjectImageResponse;
import ru.donskikh.crowdfunding.api.dto.ProjectUpdateRequest;
import ru.donskikh.crowdfunding.domain.entity.CategoryEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private ProjectController controller;

    @Test
    void createMapsProjectResponse() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        ProjectCreateRequest request = new ProjectCreateRequest();
        ProjectEntity project = project(userId);

        when(projectService.create(userId, request)).thenReturn(project);

        var response = controller.create(user, request);

        assertThat(response.getId()).isEqualTo(project.getId());
        assertThat(response.getAuthorId()).isEqualTo(userId);
    }

    @Test
    void updateMapsProjectResponse() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        ProjectUpdateRequest request = new ProjectUpdateRequest();
        ProjectEntity project = project(userId);
        project.setId(projectId);

        when(projectService.update(userId, projectId, request)).thenReturn(project);

        var response = controller.update(user, projectId, request);

        assertThat(response.getId()).isEqualTo(projectId);
        assertThat(response.getTitle()).isEqualTo("Project");
    }

    @Test
    void uploadProjectImageReturnsNoContent() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        MockMultipartFile image = new MockMultipartFile("image", "cover.png", "image/png", new byte[]{1});

        var response = controller.uploadProjectImage(user, projectId, image);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(projectService).updateCoverImage(userId, projectId, image);
    }

    @Test
    void submitMapsProjectResponse() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        ProjectEntity project = project(userId);
        project.setId(projectId);

        when(projectService.submitToModeration(userId, projectId)).thenReturn(project);

        var response = controller.submit(user, projectId);

        assertThat(response.getId()).isEqualTo(projectId);
    }

    @Test
    void catalogUsesSimpleBranchWhenNoFilters() {
        var pageable = PageRequest.of(0, 5);
        ProjectEntity project = project(UUID.randomUUID());
        when(projectService.getCatalog("q", pageable)).thenReturn(new PageImpl<>(List.of(project)));

        var page = controller.catalog("q", null, false, null, null, pageable);

        assertThat(page.getContent()).hasSize(1);
        verify(projectService).getCatalog("q", pageable);
    }

    @Test
    void catalogUsesFilteredBranchWhenAnyFilterPresent() {
        var pageable = PageRequest.of(0, 5);
        UUID authorId = UUID.randomUUID();
        ProjectEntity project = project(UUID.randomUUID());
        when(projectService.getCatalog("q", 1L, true, authorId, ProjectStatus.FUNDED, pageable))
                .thenReturn(new PageImpl<>(List.of(project)));

        var page = controller.catalog("q", 1L, true, authorId, ProjectStatus.FUNDED, pageable);

        assertThat(page.getContent()).hasSize(1);
        verify(projectService).getCatalog("q", 1L, true, authorId, ProjectStatus.FUNDED, pageable);
    }

    @Test
    void getByIdMapsProjectResponse() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = project(UUID.randomUUID());
        project.setId(projectId);
        when(projectService.getById(projectId)).thenReturn(project);

        var response = controller.getById(projectId);

        assertThat(response.getId()).isEqualTo(projectId);
    }

    @Test
    void getProjectImageBuildsBinaryResponse() {
        UUID projectId = UUID.randomUUID();
        when(projectService.getCoverImage(projectId)).thenReturn(new ProjectImageResponse(new byte[]{4, 5}, "image/png"));

        var response = controller.getProjectImage(projectId);

        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
        assertThat(response.getBody()).containsExactly(4, 5);
    }

    private static ProjectEntity project(UUID authorId) {
        UserEntity author = new UserEntity();
        author.setId(authorId);
        author.setDisplayName("Alice");

        CategoryEntity category = new CategoryEntity();
        category.setId(1L);
        category.setTitle("Tech");

        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setAuthor(author);
        project.setCategory(category);
        project.setTitle("Project");
        project.setShortDescription("Short");
        project.setDescription("Desc");
        project.setGoalAmount(BigDecimal.valueOf(1000));
        project.setCollectedAmount(BigDecimal.valueOf(100));
        project.setCurrency("RUB");
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCreatedAt(OffsetDateTime.now());
        project.setUpdatedAt(OffsetDateTime.now());
        return project;
    }
}
