package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.ProjectUpdateService;
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
class ProjectUpdateControllerTest {

    @Mock
    private ProjectUpdateService projectUpdateService;

    @InjectMocks
    private ProjectUpdateController controller;

    @Test
    void createMapsSavedUpdate() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        AppUserDetails user = new AppUserDetails(userId, "author@example.com", "hash", List.of());
        ProjectUpdateCreateRequest request = new ProjectUpdateCreateRequest();
        request.setTitle("Update");
        request.setContent("Body");

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity author = new UserEntity();
        author.setId(userId);
        author.setDisplayName("Alice");
        ProjectUpdateEntity update = new ProjectUpdateEntity();
        update.setId(UUID.randomUUID());
        update.setProject(project);
        update.setAuthor(author);
        update.setTitle("Update");
        update.setContent("Body");
        update.setCreatedAt(OffsetDateTime.now());

        when(projectUpdateService.create(userId, projectId, request)).thenReturn(update);

        var response = controller.create(user, projectId, request);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getAuthorId()).isEqualTo(userId);
    }

    @Test
    void listMapsUpdateList() {
        UUID projectId = UUID.randomUUID();
        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        UserEntity author = new UserEntity();
        author.setId(UUID.randomUUID());
        author.setDisplayName("Bob");
        ProjectUpdateEntity update = new ProjectUpdateEntity();
        update.setId(UUID.randomUUID());
        update.setProject(project);
        update.setAuthor(author);
        update.setTitle("Title");
        update.setContent("Content");
        update.setCreatedAt(OffsetDateTime.now());

        when(projectUpdateService.listByProject(projectId)).thenReturn(List.of(update));

        var result = controller.list(projectId);

        assertThat(result).singleElement().satisfies(item -> assertThat(item.getProjectId()).isEqualTo(projectId));
    }
}
