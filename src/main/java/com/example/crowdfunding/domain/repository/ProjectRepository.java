package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    @EntityGraph(attributePaths = {"author", "category"})
    Page<ProjectEntity> findByStatus(ProjectStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "category"})
    Page<ProjectEntity> findByStatusAndTitleStartingWithIgnoreCase(
            ProjectStatus status,
            String title,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"author", "category"})
    @Query("""
            select p
            from ProjectEntity p
            where p.status in :statuses
              and (:q is null or :q = '' or lower(p.title) like lower(concat(:q, '%')))
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

    @Query(
            value = """
                    select new com.example.crowdfunding.api.dto.PublicFounderResponse(
                        a.id,
                        a.displayName,
                        count(p.id),
                        coalesce(sum(p.collectedAmount), 0),
                        max(p.createdAt)
                    )
                    from ProjectEntity p
                    join p.author a
                    join a.roles r
                    where p.status in :statuses
                      and a.status = :userStatus
                      and r.code = :roleCode
                      and (:q is null or :q = '' or lower(a.displayName) like lower(concat('%', :q, '%')))
                    group by a.id, a.displayName
                    order by max(p.createdAt) desc, coalesce(sum(p.collectedAmount), 0) desc
                    """,
            countQuery = """
                    select count(distinct a.id)
                    from ProjectEntity p
                    join p.author a
                    join a.roles r
                    where p.status in :statuses
                      and a.status = :userStatus
                      and r.code = :roleCode
                      and (:q is null or :q = '' or lower(a.displayName) like lower(concat('%', :q, '%')))
                    """
    )
    Page<PublicFounderResponse> findPublicFounders(
            Collection<ProjectStatus> statuses,
            UserStatus userStatus,
            RoleCode roleCode,
            String q,
            Pageable pageable
    );

    @Query("select min(p.createdAt) from ProjectEntity p")
    OffsetDateTime findFirstProjectCreatedAt();
}
