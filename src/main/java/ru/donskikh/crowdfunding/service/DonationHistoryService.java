package ru.donskikh.crowdfunding.service;

import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface DonationHistoryService {
    Page<DonationEntity> myDonations(UUID sponsorId, Pageable pageable);
    Optional<DonationEntity> myDonation(UUID sponsorId, UUID donationId);
    Page<DonationEntity> publicProjectDonations(UUID projectId, Pageable pageable);
    Page<DonationEntity> projectDonations(UUID requesterId, boolean requesterIsAdmin, UUID projectId, Pageable pageable);
}
