package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    @EntityGraph(attributePaths = {"author", "category"})
    Page<ProjectEntity> findByStatus(ProjectStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "category"})
    Page<ProjectEntity> findByStatusAndTitleContainingIgnoreCase(
            ProjectStatus status,
            String title,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"author", "category"})
    Optional<ProjectEntity> findWithAuthorAndCategoryById(UUID id);
}