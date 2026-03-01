package com.example.crowdfunding.service;

import com.example.crowdfunding.domain.entity.DonationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface DonationHistoryService {
    Page<DonationEntity> myDonations(UUID sponsorId, Pageable pageable);
    Page<DonationEntity> projectDonations(UUID requesterId, boolean requesterIsAdmin, UUID projectId, Pageable pageable);
}