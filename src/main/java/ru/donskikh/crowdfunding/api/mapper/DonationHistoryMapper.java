package ru.donskikh.crowdfunding.api.mapper;

import ru.donskikh.crowdfunding.api.dto.MyDonationResponse;
import ru.donskikh.crowdfunding.api.dto.ProjectDonationResponse;
import ru.donskikh.crowdfunding.domain.entity.DonationEntity;

public class DonationHistoryMapper {

    public static MyDonationResponse toMy(DonationEntity d) {
        MyDonationResponse r = new MyDonationResponse();
        r.setId(d.getId());
        r.setProjectId(d.getProject().getId());
        r.setProjectTitle(d.getProject().getTitle());
        r.setHasProjectCoverImage(d.getProject().getCoverImageContentType() != null
                && !d.getProject().getCoverImageContentType().isBlank());
        r.setAmount(d.getAmount());
        r.setStatus(d.getStatus().name());
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
        r.setStatus(d.getStatus().name());
        r.setCreatedAt(d.getCreatedAt());
        r.setConfirmedAt(d.getConfirmedAt());
        return r;
    }
}
