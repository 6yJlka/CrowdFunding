package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectReviewRepository;
import com.example.crowdfunding.service.PublicShowcaseService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PublicShowcaseServiceImpl implements PublicShowcaseService {

    private static final List<ProjectStatus> PUBLIC_PROJECT_STATUSES = List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED);

    private final DonationRepository donationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectReviewRepository projectReviewRepository;

    public PublicShowcaseServiceImpl(DonationRepository donationRepository,
                                     ProjectRepository projectRepository,
                                     ProjectReviewRepository projectReviewRepository) {
        this.donationRepository = donationRepository;
        this.projectRepository = projectRepository;
        this.projectReviewRepository = projectReviewRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PublicFounderResponse> getFounders(String q, Pageable pageable) {
        return projectRepository.findPublicFounders(
                PUBLIC_PROJECT_STATUSES,
                UserStatus.ACTIVE,
                RoleCode.AUTHOR,
                q == null ? null : q.trim(),
                pageable
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PublicSponsorResponse> getSponsors(String q, Pageable pageable) {
        return donationRepository.findPublicSponsors(
                DonationStatus.SUCCEEDED,
                UserStatus.ACTIVE,
                RoleCode.SPONSOR,
                q == null ? null : q.trim(),
                pageable
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PublicReviewFeedResponse> getReviews(String q, Pageable pageable) {
        return projectReviewRepository.findPublicReviewFeed(
                PUBLIC_PROJECT_STATUSES,
                q == null ? null : q.trim(),
                pageable
        );
    }
}
