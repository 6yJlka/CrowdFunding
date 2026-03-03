package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectReviewRepository extends JpaRepository<ProjectReviewEntity, UUID> {

    @EntityGraph(attributePaths = {"user"})  // Явная загрузка связи с пользователем
    List<ProjectReviewEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}