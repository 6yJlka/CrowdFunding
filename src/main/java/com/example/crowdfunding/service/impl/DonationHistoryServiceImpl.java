package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.service.DonationHistoryService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class DonationHistoryServiceImpl implements DonationHistoryService {

    private final DonationRepository donationRepository;
    private final ProjectRepository projectRepository;

    public DonationHistoryServiceImpl(DonationRepository donationRepository,
                                      ProjectRepository projectRepository) {
        this.donationRepository = donationRepository;
        this.projectRepository = projectRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.example.crowdfunding.domain.entity.DonationEntity> myDonations(UUID sponsorId, Pageable pageable) {
        return donationRepository.findBySponsorIdOrderByCreatedAtDesc(sponsorId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<com.example.crowdfunding.domain.entity.DonationEntity> myDonation(UUID sponsorId, UUID donationId) {
        return donationRepository.findByIdAndSponsorId(donationId, sponsorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.example.crowdfunding.domain.entity.DonationEntity> publicProjectDonations(UUID projectId, Pageable pageable) {
        return donationRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, DonationStatus.SUCCEEDED, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.example.crowdfunding.domain.entity.DonationEntity> projectDonations(
            UUID requesterId,
            boolean requesterIsAdmin,
            UUID projectId,
            Pageable pageable
    ) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        boolean isAuthor = project.getAuthor().getId().equals(requesterId);
        if (!isAuthor && !requesterIsAdmin) {
            throw new IllegalStateException("Only project author or admin can view donations");
        }

        return donationRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable);
    }
}
