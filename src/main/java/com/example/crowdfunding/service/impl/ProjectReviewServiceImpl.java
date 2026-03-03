package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.ProjectReviewRequest;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectReviewRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.service.ProjectReviewService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectReviewServiceImpl implements ProjectReviewService {

    private final ProjectReviewRepository projectReviewRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectReviewServiceImpl(ProjectReviewRepository projectReviewRepository,
                                    ProjectRepository projectRepository,
                                    UserRepository userRepository) {
        this.projectReviewRepository = projectReviewRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public ProjectReviewEntity create(UUID userId, UUID projectId, ProjectReviewRequest req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        ProjectReviewEntity review = new ProjectReviewEntity();
        review.setProject(project);
        review.setUser(user);
        review.setRating(req.getRating());
        review.setReviewText(req.getReviewText());

        return projectReviewRepository.save(review);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectReviewEntity> getAllByProject(UUID projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new EntityNotFoundException("Project not found: " + projectId);
        }
        return projectReviewRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}