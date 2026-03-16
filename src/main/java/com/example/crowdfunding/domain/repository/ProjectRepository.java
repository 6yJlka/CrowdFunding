package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
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
    @Query("""
            select p
            from ProjectEntity p
            where p.status in :statuses
              and (:q is null or :q = '' or lower(p.title) like lower(concat('%', :q, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
            """)
    Page<ProjectEntity> findPublicCatalog(
            Collection<ProjectStatus> statuses,
            String q,
            Long categoryId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"author", "category"})
    Page<ProjectEntity> findByAuthorIdOrderByCreatedAtDesc(UUID authorId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "category"})
    Optional<ProjectEntity> findWithAuthorAndCategoryById(UUID id);

    long countByStatus(ProjectStatus status);

    @Query("select coalesce(sum(p.collectedAmount), 0) from ProjectEntity p where p.status in :statuses")
    BigDecimal sumCollectedAmountByStatusIn(Collection<ProjectStatus> statuses);

    @EntityGraph(attributePaths = {"author", "category"})
    List<ProjectEntity> findByStatusIn(Collection<ProjectStatus> statuses, Pageable pageable);
}
