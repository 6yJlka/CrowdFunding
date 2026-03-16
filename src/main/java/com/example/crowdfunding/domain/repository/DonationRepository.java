package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.Collection;
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
}
