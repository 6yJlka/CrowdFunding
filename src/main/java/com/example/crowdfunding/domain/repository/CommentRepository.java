package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.CommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<CommentEntity, UUID> {

    @EntityGraph(attributePaths = {"user", "parent"})
    List<CommentEntity> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    @EntityGraph(attributePaths = {"user", "project"})
    @Query("""
            select c
            from CommentEntity c
            where c.deleted = false
              and (:q is null or :q = ''
                or lower(c.content) like lower(concat('%', :q, '%'))
                or lower(c.user.displayName) like lower(concat('%', :q, '%'))
                or lower(c.user.email) like lower(concat('%', :q, '%'))
                or lower(c.project.title) like lower(concat('%', :q, '%')))
            """)
    Page<CommentEntity> findAllForAdmin(String q, Pageable pageable);

    boolean existsByProjectIdAndId(UUID projectId, UUID id);
}
