package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectUpdateRepository extends JpaRepository<ProjectUpdateEntity, UUID> {

    @EntityGraph(attributePaths = {"author"})
    List<ProjectUpdateEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}