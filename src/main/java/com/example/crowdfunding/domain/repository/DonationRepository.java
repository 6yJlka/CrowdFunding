package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.DonationEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DonationRepository extends JpaRepository<DonationEntity, UUID> {

    Optional<DonationEntity> findByProviderAndExternalPaymentId(
            String provider,
            String externalPaymentId
    );

    // --- История поддержек спонсора ---
    @EntityGraph(attributePaths = {"project"})
    Page<DonationEntity> findBySponsorIdOrderByCreatedAtDesc(
            UUID sponsorId,
            Pageable pageable
    );

    // --- Донаты конкретного проекта ---
    @EntityGraph(attributePaths = {"sponsor"})
    Page<DonationEntity> findByProjectIdOrderByCreatedAtDesc(
            UUID projectId,
            Pageable pageable
    );

    // --- Пригодится для отзывов ---
    boolean existsBySponsorIdAndProjectIdAndStatus(
            UUID sponsorId,
            UUID projectId,
            DonationStatus status
    );
}