package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.CommentEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<CommentEntity, UUID> {

    @EntityGraph(attributePaths = {"user", "parent"})
    List<CommentEntity> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    boolean existsByProjectIdAndId(UUID projectId, UUID id);
}