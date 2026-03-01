package com.example.crowdfunding.domain.repository;

import com.example.crowdfunding.domain.entity.DonationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DonationRepository extends JpaRepository<DonationEntity, UUID> {
    Optional<DonationEntity> findByProviderAndExternalPaymentId(String provider, String externalPaymentId);
}