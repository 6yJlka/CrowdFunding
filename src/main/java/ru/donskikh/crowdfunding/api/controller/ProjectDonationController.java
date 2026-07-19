package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.ProjectDonationResponse;
import ru.donskikh.crowdfunding.api.mapper.DonationHistoryMapper;
import ru.donskikh.crowdfunding.security.AppUserDetails;
import ru.donskikh.crowdfunding.service.DonationHistoryService;
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

    @GetMapping("/public")
    public Page<ProjectDonationResponse> publicProjectDonations(
            @PathVariable UUID projectId,
            Pageable pageable
    ) {
        return donationHistoryService.publicProjectDonations(projectId, pageable)
                .map(DonationHistoryMapper::toProject);
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
