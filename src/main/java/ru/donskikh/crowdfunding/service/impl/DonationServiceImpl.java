package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.DonationCreateRequest;
import ru.donskikh.crowdfunding.api.dto.PaymentStartResponse;
import ru.donskikh.crowdfunding.domain.entity.DonationEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.DonationStatus;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.domain.repository.DonationRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import ru.donskikh.crowdfunding.payment.PaymentProvider;
import ru.donskikh.crowdfunding.service.DonationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class DonationServiceImpl implements DonationService {

    private final DonationRepository donationRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final PaymentProvider paymentProvider; // Demo payment provider used for local development.

    public DonationServiceImpl(DonationRepository donationRepository,
                               ProjectRepository projectRepository,
                               UserRepository userRepository,
                               PaymentProvider paymentProvider) {
        this.donationRepository = donationRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.paymentProvider = paymentProvider;
    }

    @Override
    @Transactional
    public PaymentStartResponse createAndStartPayment(UUID sponsorId, DonationCreateRequest req) {
        UserEntity sponsor = userRepository.findById(sponsorId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + sponsorId));

        ProjectEntity project = projectRepository.findById(req.getProjectId())
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + req.getProjectId()));

        if (project.getStatus() != ProjectStatus.ACTIVE) {
            throw new IllegalStateException("Donations allowed only for ACTIVE projects");
        }

        DonationEntity d = new DonationEntity();
        d.setSponsor(sponsor);
        d.setProject(project);
        d.setAmount(req.getAmount());
        d.setStatus(DonationStatus.PENDING);
        d.setProvider(paymentProvider.getName());

        DonationEntity saved = donationRepository.save(d);

        var start = paymentProvider.startPayment(saved.getId(), saved.getAmount());
        saved.setExternalPaymentId(start.externalPaymentId());

        donationRepository.save(saved);

        PaymentStartResponse resp = new PaymentStartResponse();
        resp.setDonationId(saved.getId());
        resp.setProvider(saved.getProvider());
        resp.setExternalPaymentId(saved.getExternalPaymentId());
        resp.setPaymentUrl(start.paymentUrl());
        resp.setStatus(saved.getStatus().name());
        return resp;
    }

    @Override
    @Transactional
    public void handleWebhook(String provider, String externalPaymentId, boolean success) {
        DonationEntity d = donationRepository.findByProviderAndExternalPaymentId(provider, externalPaymentId)
                .orElseThrow(() -> new EntityNotFoundException("Donation not found for " + provider + ":" + externalPaymentId));

        if (d.getStatus() != DonationStatus.PENDING) {
            return; // Webhook processing is idempotent.
        }

        if (!success) {
            d.setStatus(DonationStatus.FAILED);
            donationRepository.save(d);
            return;
        }

        d.setStatus(DonationStatus.SUCCEEDED);
        d.setConfirmedAt(OffsetDateTime.now());
        donationRepository.save(d);

        ProjectEntity p = d.getProject();
        BigDecimal newCollected = p.getCollectedAmount().add(d.getAmount());
        p.setCollectedAmount(newCollected);

        if (newCollected.compareTo(p.getGoalAmount()) >= 0 && p.getStatus() == ProjectStatus.ACTIVE) {
            p.setStatus(ProjectStatus.FUNDED);
        }

        projectRepository.save(p);
    }
}
