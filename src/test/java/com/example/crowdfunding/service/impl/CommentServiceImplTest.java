package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.CommentCreateRequest;
import com.example.crowdfunding.domain.entity.CommentEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.repository.CommentRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {

    @Mock
    private CommentRepository commentRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentServiceImpl service;

    @Test
    void createRejectsParentCommentFromAnotherProject() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID anotherProjectId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(userId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        ProjectEntity anotherProject = new ProjectEntity();
        anotherProject.setId(anotherProjectId);

        CommentEntity parent = new CommentEntity();
        parent.setId(parentId);
        parent.setProject(anotherProject);

        CommentCreateRequest request = new CommentCreateRequest();
        request.setContent("Reply");
        request.setParentId(parentId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(commentRepository.findById(parentId)).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> service.create(userId, projectId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Parent comment belongs to another project");
    }

    @Test
    void createPersistsCommentForSameProjectParent() {
        UUID userId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(userId);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        CommentEntity parent = new CommentEntity();
        parent.setId(parentId);
        parent.setProject(project);

        CommentCreateRequest request = new CommentCreateRequest();
        request.setContent("Hello");
        request.setParentId(parentId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(commentRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(commentRepository.save(any(CommentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CommentEntity saved = service.create(userId, projectId, request);

        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getProject()).isEqualTo(project);
        assertThat(saved.getParent()).isEqualTo(parent);
        assertThat(saved.getContent()).isEqualTo("Hello");
        assertThat(saved.isDeleted()).isFalse();
    }

    @Test
    void listByProjectThrowsWhenProjectMissing() {
        UUID projectId = UUID.randomUUID();
        when(projectRepository.existsById(projectId)).thenReturn(false);

        assertThatThrownBy(() -> service.listByProject(projectId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Project not found: " + projectId);
    }

    @Test
    void listForAdminTrimsQuery() {
        var pageable = PageRequest.of(0, 5);
        when(commentRepository.findAllForAdmin("alice", pageable)).thenReturn(new PageImpl<>(List.of()));

        service.listForAdmin(" alice ", pageable);

        verify(commentRepository).findAllForAdmin("alice", pageable);
    }

    @Test
    void deleteMarksCommentDeletedForOwner() {
        UUID requesterId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(requesterId);

        CommentEntity comment = new CommentEntity();
        comment.setId(commentId);
        comment.setUser(user);
        comment.setContent("Text");
        comment.setDeleted(false);

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        service.delete(requesterId, false, commentId);

        ArgumentCaptor<CommentEntity> captor = ArgumentCaptor.forClass(CommentEntity.class);
        verify(commentRepository).save(captor.capture());
        assertThat(captor.getValue().isDeleted()).isTrue();
        assertThat(captor.getValue().getContent()).isEqualTo("[deleted]");
    }

    @Test
    void deleteDoesNothingWhenAlreadyDeleted() {
        UUID requesterId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(requesterId);

        CommentEntity comment = new CommentEntity();
        comment.setId(commentId);
        comment.setUser(user);
        comment.setDeleted(true);

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        service.delete(requesterId, false, commentId);

        verify(commentRepository, never()).save(any(CommentEntity.class));
    }

    @Test
    void deleteRejectsNonOwnerNonAdmin() {
        UUID requesterId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());

        CommentEntity comment = new CommentEntity();
        comment.setId(commentId);
        comment.setUser(user);

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.delete(requesterId, false, commentId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only comment owner or admin can delete comment");
    }
}
