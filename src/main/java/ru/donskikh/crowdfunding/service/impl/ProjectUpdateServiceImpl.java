package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.ProjectUpdateCreateRequest;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectUpdateEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectUpdateRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import ru.donskikh.crowdfunding.service.ProjectUpdateService;
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

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only project author can post updates");
        }

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
        // Missing projects return 404 instead of an empty update list.
        if (!projectRepository.existsById(projectId)) {
            throw new EntityNotFoundException("Project not found: " + projectId);
        }
        return projectUpdateRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}
