package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.CommentCreateRequest;
import com.example.crowdfunding.domain.entity.CommentEntity;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.repository.CommentRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.service.CommentService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public CommentServiceImpl(CommentRepository commentRepository,
                              ProjectRepository projectRepository,
                              UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public CommentEntity create(UUID userId, UUID projectId, CommentCreateRequest req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        CommentEntity parent = null;
        if (req.getParentId() != null) {
            parent = commentRepository.findById(req.getParentId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent comment not found: " + req.getParentId()));

            // запретить отвечать на комментарий другого проекта
            if (!parent.getProject().getId().equals(projectId)) {
                throw new IllegalArgumentException("Parent comment belongs to another project");
            }
        }

        CommentEntity c = new CommentEntity();
        c.setProject(project);
        c.setUser(user);
        c.setParent(parent);
        c.setContent(req.getContent());
        c.setDeleted(false);

        return commentRepository.save(c);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentEntity> listByProject(UUID projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new EntityNotFoundException("Project not found: " + projectId);
        }
        return commentRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
    }

    @Override
    @Transactional
    public void delete(UUID requesterId, boolean requesterIsAdmin, UUID commentId) {
        CommentEntity c = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found: " + commentId));

        boolean isOwner = c.getUser().getId().equals(requesterId);
        if (!isOwner && !requesterIsAdmin) {
            throw new IllegalStateException("Only comment owner or admin can delete comment");
        }

        if (!c.isDeleted()) {
            c.setDeleted(true);
            c.setContent("[deleted]");
            commentRepository.save(c);
        }
    }
}