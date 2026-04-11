package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
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

public interface DonationRepository extends JpaRepository<DonationEntity, UUID> {

    Optional<DonationEntity> findByProviderAndExternalPaymentId(
            String provider,
            String externalPaymentId
    );

    @EntityGraph(attributePaths = {"project"})
    Page<DonationEntity> findBySponsorIdOrderByCreatedAtDesc(
            UUID sponsorId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"project"})
    Optional<DonationEntity> findByIdAndSponsorId(UUID id, UUID sponsorId);

    @EntityGraph(attributePaths = {"sponsor"})
    Page<DonationEntity> findByProjectIdOrderByCreatedAtDesc(
            UUID projectId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"sponsor"})
    Page<DonationEntity> findByProjectIdAndStatusOrderByCreatedAtDesc(
            UUID projectId,
            DonationStatus status,
            Pageable pageable
    );

    boolean existsBySponsorIdAndProjectIdAndStatus(
            UUID sponsorId,
            UUID projectId,
            DonationStatus status
    );

    @Query("SELECT SUM(d.amount) FROM DonationEntity d WHERE d.project.id = :projectId AND d.status = :status")
    BigDecimal sumDonationsByProjectIdAndStatus(UUID projectId, DonationStatus status);

    @Query("SELECT COUNT(DISTINCT d.sponsor.id) FROM DonationEntity d WHERE d.project.id = :projectId AND d.status = :status")
    Integer countDistinctSponsorsByProjectIdAndStatus(UUID projectId, DonationStatus status);

    @Query("SELECT COUNT(DISTINCT d.sponsor.id) FROM DonationEntity d WHERE d.status = :status AND d.project.status IN :projectStatuses")
    long countDistinctSponsorsByStatusAndProjectStatusIn(
            DonationStatus status,
            Collection<ProjectStatus> projectStatuses
    );

    @Query("""
            select d
            from DonationEntity d
            join fetch d.project p
            where d.status = :status
              and p.status in :projectStatuses
            order by coalesce(d.confirmedAt, d.createdAt) asc
            """)
    List<DonationEntity> findAllSucceededForDashboard(
            DonationStatus status,
            Collection<ProjectStatus> projectStatuses
    );

    @Query("""
            select min(coalesce(d.confirmedAt, d.createdAt))
            from DonationEntity d
            join d.project p
            where d.status = :status
              and p.status in :projectStatuses
            """)
    OffsetDateTime findFirstRelevantDonationAt(
            DonationStatus status,
            Collection<ProjectStatus> projectStatuses
    );

    @Query(
            value = """
                    select new com.example.crowdfunding.api.dto.PublicSponsorResponse(
                        s.id,
                        s.displayName,
                        count(distinct p.id),
                        coalesce(sum(d.amount), 0),
                        max(coalesce(d.confirmedAt, d.createdAt))
                    )
                    from DonationEntity d
                    join d.sponsor s
                    join d.project p
                    join s.roles r
                    where d.status = :status
                      and s.status = :userStatus
                      and r.code = :roleCode
                      and (:q is null or :q = '' or lower(s.displayName) like lower(concat('%', :q, '%')))
                    group by s.id, s.displayName
                    order by coalesce(sum(d.amount), 0) desc, max(coalesce(d.confirmedAt, d.createdAt)) desc
                    """,
            countQuery = """
                    select count(distinct s.id)
                    from DonationEntity d
                    join d.sponsor s
                    join s.roles r
                    where d.status = :status
                      and s.status = :userStatus
                      and r.code = :roleCode
                      and (:q is null or :q = '' or lower(s.displayName) like lower(concat('%', :q, '%')))
                    """
    )
    Page<PublicSponsorResponse> findPublicSponsors(
            DonationStatus status,
            UserStatus userStatus,
            RoleCode roleCode,
            String q,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"sponsor", "sponsor.roles", "project"})
    @Query("""
            select d
            from DonationEntity d
            join d.sponsor s
            join d.project p
            join s.roles r
            where d.status = :status
              and p.status in :projectStatuses
              and s.status = :userStatus
              and r.code = :roleCode
            order by coalesce(d.confirmedAt, d.createdAt) desc
            """)
    List<DonationEntity> findRecentPublicSponsorDonations(
            DonationStatus status,
            Collection<ProjectStatus> projectStatuses,
            UserStatus userStatus,
            RoleCode roleCode,
            Pageable pageable
    );

    @Query("""
            select count(d.id) > 0
            from DonationEntity d
            join d.sponsor s
            join s.roles r
            join d.project p
            where s.id = :sponsorId
              and d.status = :status
              and p.status in :projectStatuses
              and s.status = :userStatus
              and r.code = :roleCode
            """)
    boolean existsPublicSponsor(
            UUID sponsorId,
            DonationStatus status,
            Collection<ProjectStatus> projectStatuses,
            UserStatus userStatus,
            RoleCode roleCode
    );
}
