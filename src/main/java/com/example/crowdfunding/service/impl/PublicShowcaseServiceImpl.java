package com.example.crowdfunding.service.impl;

import com.example.crowdfunding.api.dto.PublicFounderResponse;
import com.example.crowdfunding.api.dto.PublicReviewFeedResponse;
import com.example.crowdfunding.api.dto.PublicSponsorResponse;
import com.example.crowdfunding.api.dto.UserAvatarResponse;
import com.example.crowdfunding.domain.entity.UserEntity;
import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.RoleCode;
import com.example.crowdfunding.domain.enums.UserStatus;
import com.example.crowdfunding.domain.repository.DonationRepository;
import com.example.crowdfunding.domain.repository.ProjectRepository;
import com.example.crowdfunding.domain.repository.ProjectReviewRepository;
import com.example.crowdfunding.domain.repository.UserRepository;
import com.example.crowdfunding.service.PublicShowcaseService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PublicShowcaseServiceImpl implements PublicShowcaseService {

    private static final List<ProjectStatus> PUBLIC_PROJECT_STATUSES = List.of(ProjectStatus.ACTIVE, ProjectStatus.FUNDED);

    private final DonationRepository donationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectReviewRepository projectReviewRepository;
    private final UserRepository userRepository;

    public PublicShowcaseServiceImpl(DonationRepository donationRepository,
                                     ProjectRepository projectRepository,
                                     ProjectReviewRepository projectReviewRepository,
                                     UserRepository userRepository) {
        this.donationRepository = donationRepository;
        this.projectRepository = projectRepository;
        this.projectReviewRepository = projectReviewRepository;
        this.userRepository = userRepository;
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
    public UserAvatarResponse getFounderAvatar(UUID authorId) {
        boolean isPublicFounder = projectRepository.existsPublicFounder(
                authorId,
                PUBLIC_PROJECT_STATUSES,
                UserStatus.ACTIVE,
                RoleCode.AUTHOR
        );

        if (!isPublicFounder) {
            throw new EntityNotFoundException("Founder not found");
        }

        UserEntity entity = userRepository.findById(authorId)
                .orElseThrow(() -> new EntityNotFoundException("Founder not found"));

        byte[] avatar = entity.getAvatarBytes();
        if (avatar == null || avatar.length == 0) {
            throw new EntityNotFoundException("Avatar not found");
        }

        return new UserAvatarResponse(avatar, entity.getAvatarContentType());
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
    public UserAvatarResponse getSponsorAvatar(UUID sponsorId) {
        boolean isPublicSponsor = donationRepository.existsPublicSponsor(
                sponsorId,
                DonationStatus.SUCCEEDED,
                PUBLIC_PROJECT_STATUSES,
                UserStatus.ACTIVE,
                RoleCode.SPONSOR
        );

        if (!isPublicSponsor) {
            throw new EntityNotFoundException("Sponsor not found");
        }

        UserEntity entity = userRepository.findById(sponsorId)
                .orElseThrow(() -> new EntityNotFoundException("Sponsor not found"));

        byte[] avatar = entity.getAvatarBytes();
        if (avatar == null || avatar.length == 0) {
            throw new EntityNotFoundException("Avatar not found");
        }

        return new UserAvatarResponse(avatar, entity.getAvatarContentType());
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
