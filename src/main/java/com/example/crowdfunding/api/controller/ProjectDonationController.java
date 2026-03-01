package com.example.crowdfunding.api.controller;

import com.example.crowdfunding.api.dto.ProjectDonationResponse;
import com.example.crowdfunding.api.mapper.DonationHistoryMapper;
import com.example.crowdfunding.security.AppUserDetails;
import com.example.crowdfunding.service.DonationHistoryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/donations")
public class ProjectDonationController {

    private final DonationHistoryService donationHistoryService;

    public ProjectDonationController(DonationHistoryService donationHistoryService) {
        this.donationHistoryService = donationHistoryService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public Page<ProjectDonationResponse> projectDonations(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable UUID projectId,
            Pageable pageable
    ) {
        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        return donationHistoryService.projectDonations(user.getId(), isAdmin, projectId, pageable)
                .map(DonationHistoryMapper::toProject);
    }
}