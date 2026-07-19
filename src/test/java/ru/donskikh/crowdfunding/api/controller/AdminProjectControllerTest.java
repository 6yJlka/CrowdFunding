package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.RejectProjectRequest;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private AdminProjectController controller;

    @Test
    void moderationQueueMapsProjects() {
        var pageable = PageRequest.of(0, 5);
        ProjectEntity project = project();
        when(projectService.getProjectsByStatus(ProjectStatus.MODERATION, pageable)).thenReturn(new PageImpl<>(List.of(project)));

        var result = controller.moderationQueue(ProjectStatus.MODERATION, pageable);

        assertThat(result.getContent()).singleElement().satisfies(item -> assertThat(item.getTitle()).isEqualTo("Project"));
    }

    @Test
    void approveMapsProject() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = project();
        project.setId(projectId);
        when(projectService.approve(projectId)).thenReturn(project);

        var response = controller.approve(projectId);

        assertThat(response.getId()).isEqualTo(projectId);
    }

    @Test
    void rejectPassesReason() {
        UUID projectId = UUID.randomUUID();
        RejectProjectRequest request = new RejectProjectRequest();
        request.setReason("Need fixes");
        ProjectEntity project = project();
        project.setId(projectId);
        when(projectService.reject(projectId, "Need fixes")).thenReturn(project);

        var response = controller.reject(projectId, request);

        assertThat(response.getId()).isEqualTo(projectId);
        verify(projectService).reject(projectId, "Need fixes");
    }

    private static ProjectEntity project() {
        UserEntity author = new UserEntity();
        author.setId(UUID.randomUUID());
        author.setDisplayName("Alice");
        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setAuthor(author);
        project.setTitle("Project");
        project.setShortDescription("Short");
        project.setDescription("Desc");
        project.setGoalAmount(BigDecimal.TEN);
        project.setCollectedAmount(BigDecimal.ONE);
        project.setCurrency("RUB");
        project.setStatus(ProjectStatus.MODERATION);
        project.setCreatedAt(OffsetDateTime.now());
        project.setUpdatedAt(OffsetDateTime.now());
        return project;
    }
}
