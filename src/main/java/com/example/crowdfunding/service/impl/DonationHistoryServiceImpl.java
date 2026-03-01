package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.domain.entity.ProjectEntity;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.service.DonationHistoryService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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