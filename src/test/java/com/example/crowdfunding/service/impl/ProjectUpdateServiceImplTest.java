package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectUpdateRepository;
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
class ProjectUpdateServiceImplTest {

    @Mock
    private ProjectUpdateRepository projectUpdateRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProjectUpdateServiceImpl service;

    @Test
    void createRejectsNonAuthor() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity requester = new UserEntity();
        requester.setId(authorId);

        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(owner);
        project.setStatus(ProjectStatus.ACTIVE);

        ProjectUpdateCreateRequest request = new ProjectUpdateCreateRequest();
        request.setTitle("Update");
        request.setContent("Body");

        when(userRepository.findById(authorId)).thenReturn(Optional.of(requester));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.create(authorId, projectId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only project author can post updates");
    }

    @Test
    void createRejectsDraftProject() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.DRAFT);

        ProjectUpdateCreateRequest request = new ProjectUpdateCreateRequest();
        request.setTitle("Update");
        request.setContent("Body");

        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.create(authorId, projectId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Cannot post updates for DRAFT project");
    }

    @Test
    void createSavesUpdateForAuthor() {
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        UserEntity author = new UserEntity();
        author.setId(authorId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setAuthor(author);
        project.setStatus(ProjectStatus.ACTIVE);

        ProjectUpdateCreateRequest request = new ProjectUpdateCreateRequest();
        request.setTitle("Update");
        request.setContent("Body");

        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectUpdateRepository.save(any(ProjectUpdateEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectUpdateEntity update = service.create(authorId, projectId, request);

        assertThat(update.getAuthor()).isEqualTo(author);
        assertThat(update.getProject()).isEqualTo(project);
        assertThat(update.getTitle()).isEqualTo("Update");
        assertThat(update.getContent()).isEqualTo("Body");
    }

    @Test
    void listByProjectRequiresExistingProject() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.existsById(projectId)).thenReturn(false);

        assertThatThrownBy(() -> service.listByProject(projectId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Project not found: " + projectId);
    }

    @Test
    void listByProjectReturnsRepositoryData() {
        UUID projectId = UUID.randomUUID();
        ProjectUpdateEntity update = new ProjectUpdateEntity();

        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(projectUpdateRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(update));

        assertThat(service.listByProject(projectId)).containsExactly(update);
        verify(projectUpdateRepository).findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}
