package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectUpdateRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.service.ProjectUpdateService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectUpdateServiceImpl implements ProjectUpdateService {

    private final ProjectUpdateRepository projectUpdateRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectUpdateServiceImpl(ProjectUpdateRepository projectUpdateRepository,
                                    ProjectRepository projectRepository,
                                    UserRepository userRepository) {
        this.projectUpdateRepository = projectUpdateRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public ProjectUpdateEntity create(UUID authorId, UUID projectId, ProjectUpdateCreateRequest req) {
        UserEntity author = userRepository.findById(authorId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + authorId));

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        // только автор проекта
        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only project author can post updates");
        }

        // логика: обновления обычно имеют смысл после отправки/публикации
        // разрешим для MODERATION/ACTIVE/FUNDED/CLOSED, запретим для DRAFT
        if (project.getStatus() == ProjectStatus.DRAFT) {
            throw new IllegalStateException("Cannot post updates for DRAFT project");
        }

        ProjectUpdateEntity u = new ProjectUpdateEntity();
        u.setProject(project);
        u.setAuthor(author);
        u.setTitle(req.getTitle());
        u.setContent(req.getContent());

        return projectUpdateRepository.save(u);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectUpdateEntity> listByProject(UUID projectId) {
        // если проекта нет — 404 (чтобы не светить пустым списком несуществующий id)
        if (!projectRepository.existsById(projectId)) {
            throw new EntityNotFoundException("Project not found: " + projectId);
        }
        return projectUpdateRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}