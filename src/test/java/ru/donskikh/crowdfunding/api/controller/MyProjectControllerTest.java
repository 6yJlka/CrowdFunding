package ru.donskikh.crowdfunding.api.controller;

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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MyProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private MyProjectController controller;

    @Test
    void myProjectsMapsPage() {
        UUID userId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        var pageable = PageRequest.of(0, 5);
        when(projectService.getAuthorProjects(userId, pageable)).thenReturn(new PageImpl<>(List.of(project(userId))));

        var result = controller.myProjects(user, pageable);

        assertThat(result.getContent()).singleElement().satisfies(item -> assertThat(item.getAuthorId()).isEqualTo(userId));
    }

    @Test
    void submitMapsProject() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        ProjectEntity project = project(userId);
        project.setId(projectId);
        when(projectService.submitToModeration(userId, projectId)).thenReturn(project);

        var response = controller.submit(user, projectId);

        assertThat(response.getId()).isEqualTo(projectId);
    }

    private static ProjectEntity project(UUID authorId) {
        UserEntity author = new UserEntity();
        author.setId(authorId);
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
        project.setStatus(ProjectStatus.ACTIVE);
        project.setCreatedAt(OffsetDateTime.now());
        project.setUpdatedAt(OffsetDateTime.now());
        return project;
    }
}
