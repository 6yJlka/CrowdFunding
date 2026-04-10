package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.domain.entity.ProjectReviewEntity;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProjectReviewRepository extends JpaRepository<ProjectReviewEntity, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<ProjectReviewEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);

    @Query(
            value = """
                    select new com.example.crowdfunding.api.dto.PublicReviewFeedResponse(
                        r.id,
                        p.id,
                        p.title,
                        u.displayName,
                        r.rating,
                        r.reviewText,
                        r.createdAt
                    )
                    from ProjectReviewEntity r
                    join r.project p
                    join r.user u
                    where p.status in :projectStatuses
                      and (:q is null or :q = ''
                           or lower(p.title) like lower(concat('%', :q, '%'))
                           or lower(u.displayName) like lower(concat('%', :q, '%'))
                           or lower(r.reviewText) like lower(concat('%', :q, '%')))
                    order by r.createdAt desc
                    """,
            countQuery = """
                    select count(r.id)
                    from ProjectReviewEntity r
                    join r.project p
                    join r.user u
                    where p.status in :projectStatuses
                      and (:q is null or :q = ''
                           or lower(p.title) like lower(concat('%', :q, '%'))
                           or lower(u.displayName) like lower(concat('%', :q, '%'))
                           or lower(r.reviewText) like lower(concat('%', :q, '%')))
                    """
    )
    Page<PublicReviewFeedResponse> findPublicReviewFeed(
            Collection<ProjectStatus> projectStatuses,
            String q,
            Pageable pageable
    );
}
