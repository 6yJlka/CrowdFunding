package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.api.dto.MyDonationResponse;
import com.example.crowdfunding.api.dto.ProjectDonationResponse;
import com.example.crowdfunding.domain.entity.DonationEntity;

public class DonationHistoryMapper {

    public static MyDonationResponse toMy(DonationEntity d) {
        MyDonationResponse r = new MyDonationResponse();
        r.setId(d.getId());
        r.setProjectId(d.getProject().getId());
        r.setProjectTitle(d.getProject().getTitle());
        r.setAmount(d.getAmount());
        r.setStatus(d.getStatus().name()); // если status enum
        r.setProvider(d.getProvider());
        r.setExternalPaymentId(d.getExternalPaymentId());
        r.setCreatedAt(d.getCreatedAt());
        r.setConfirmedAt(d.getConfirmedAt());
        return r;
    }

    public static ProjectDonationResponse toProject(DonationEntity d) {
        ProjectDonationResponse r = new ProjectDonationResponse();
        r.setId(d.getId());
        r.setSponsorId(d.getSponsor().getId());
        r.setSponsorDisplayName(d.getSponsor().getDisplayName());
        r.setAmount(d.getAmount());
        r.setStatus(d.getStatus().name()); // если enum
        r.setCreatedAt(d.getCreatedAt());
        r.setConfirmedAt(d.getConfirmedAt());
        return r;
    }
}