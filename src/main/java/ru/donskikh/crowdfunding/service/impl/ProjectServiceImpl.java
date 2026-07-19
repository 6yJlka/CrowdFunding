package ru.donskikh.crowdfunding.service.impl;

import ru.donskikh.crowdfunding.api.dto.ProjectCreateRequest;
import ru.donskikh.crowdfunding.api.dto.ProjectImageResponse;
import ru.donskikh.crowdfunding.api.dto.ProjectUpdateRequest;
import ru.donskikh.crowdfunding.domain.entity.CategoryEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import ru.donskikh.crowdfunding.domain.repository.CategoryRepository;
import ru.donskikh.crowdfunding.domain.repository.ProjectRepository;
import ru.donskikh.crowdfunding.domain.repository.UserRepository;
import ru.donskikh.crowdfunding.service.ProjectService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectServiceImpl implements ProjectService {

    private static final long MAX_PROJECT_IMAGE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int PROJECT_IMAGE_WIDTH = 1600;
    private static final int PROJECT_IMAGE_HEIGHT = 900;

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    public ProjectServiceImpl(ProjectRepository projectRepository,
                              UserRepository userRepository,
                              CategoryRepository categoryRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public ProjectEntity create(UUID authorId, ProjectCreateRequest req) {
        UserEntity author = userRepository.findById(authorId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + authorId));

        ProjectEntity project = new ProjectEntity();
        project.setAuthor(author);

        applyCreateOrUpdate(
                project,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );

        project.setStatus(ProjectStatus.DRAFT);
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity update(UUID authorId, UUID projectId, ProjectUpdateRequest req) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can update this project");
        }

        if (project.getStatus() != ProjectStatus.DRAFT && project.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be edited only in DRAFT or REJECTED");
        }

        applyCreateOrUpdate(
                project,
                req.getCategoryId(),
                req.getTitle(),
                req.getShortDescription(),
                req.getDescription(),
                req.getGoalAmount(),
                req.getCurrency(),
                req.getStartAt(),
                req.getEndAt()
        );
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public void updateCoverImage(UUID authorId, UUID projectId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Project image file is required");
        }
        if (file.getSize() > MAX_PROJECT_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Project image must be 5 MB or smaller");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Project image must be an image");
        }

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can update this project image");
        }

        try {
            ProjectCoverImage image = normalizeProjectCoverImage(file.getBytes());
            project.setCoverImageContentType(image.contentType());
            project.setCoverImageBytes(image.bytes());
            projectRepository.save(project);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read project image file");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectImageResponse getCoverImage(UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        byte[] image = project.getCoverImageBytes();
        if (image == null || image.length == 0) {
            throw new EntityNotFoundException("Project image not found");
        }

        return new ProjectImageResponse(image, project.getCoverImageContentType());
    }

    @Override
    @Transactional
    public ProjectEntity submitToModeration(UUID authorId, UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (!project.getAuthor().getId().equals(authorId)) {
            throw new IllegalStateException("Only author can submit this project");
        }

        if (project.getStatus() != ProjectStatus.DRAFT && project.getStatus() != ProjectStatus.REJECTED) {
            throw new IllegalStateException("Project can be submitted only from DRAFT or REJECTED");
        }

        project.setStatus(ProjectStatus.MODERATION);
        project.setRejectionReason(null);

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectEntity getById(UUID projectId) {
        return loadForResponse(projectId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Pageable pageable) {
        if (q == null || q.isBlank()) {
            return projectRepository.findByStatus(ProjectStatus.ACTIVE, pageable);
        }
        return projectRepository.findByStatusAndTitleStartingWithIgnoreCase(ProjectStatus.ACTIVE, q.trim(), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Long categoryId, ProjectStatus status, Pageable pageable) {
        return getCatalog(q, categoryId, false, null, status, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Long categoryId, UUID authorId, ProjectStatus status, Pageable pageable) {
        return getCatalog(q, categoryId, false, authorId, status, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getCatalog(String q, Long categoryId, boolean uncategorized, UUID authorId, ProjectStatus status, Pageable pageable) {
        ProjectStatus publicStatus = status == ProjectStatus.FUNDED ? ProjectStatus.FUNDED : ProjectStatus.ACTIVE;
        return projectRepository.findPublicCatalog(List.of(publicStatus), q == null ? null : q.trim(), categoryId, uncategorized, authorId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getAuthorProjects(UUID authorId, Pageable pageable) {
        return projectRepository.findByAuthorIdOrderByCreatedAtDesc(authorId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProjectEntity> getProjectsByStatus(ProjectStatus status, Pageable pageable) {
        return projectRepository.findByStatus(status, pageable);
    }

    private ProjectEntity loadForResponse(UUID projectId) {
        return projectRepository.findWithAuthorAndCategoryById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
    }

    private void applyCreateOrUpdate(ProjectEntity project,
                                     Long categoryId,
                                     String title,
                                     String shortDescription,
                                     String description,
                                     java.math.BigDecimal goalAmount,
                                     String currency,
                                     java.time.OffsetDateTime startAt,
                                     java.time.OffsetDateTime endAt) {

        project.setTitle(title);
        project.setShortDescription(shortDescription);
        project.setDescription(description);
        project.setGoalAmount(goalAmount);
        project.setCurrency(currency);
        project.setStartAt(startAt);
        project.setEndAt(endAt);

        if (categoryId == null) {
            project.setCategory(null);
        } else {
            CategoryEntity category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new EntityNotFoundException("Category not found: " + categoryId));
            project.setCategory(category);
        }

        if (project.getStartAt() != null && project.getEndAt() != null && !project.getEndAt().isAfter(project.getStartAt())) {
            throw new IllegalArgumentException("endAt must be after startAt");
        }

        if (project.getStartAt() != null && project.getStartAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("startAt must not be in the past");
        }
    }

    @Override
    @Transactional
    public ProjectEntity approve(UUID projectId) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (project.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be approved only from MODERATION");
        }

        project.setStatus(ProjectStatus.ACTIVE);
        project.setRejectionReason(null);
        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    @Override
    @Transactional
    public ProjectEntity reject(UUID projectId, String reason) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        if (project.getStatus() != ProjectStatus.MODERATION) {
            throw new IllegalStateException("Project can be rejected only from MODERATION");
        }

        project.setStatus(ProjectStatus.REJECTED);
        project.setRejectionReason(reason == null ? null : reason.trim());

        ProjectEntity saved = projectRepository.save(project);
        return loadForResponse(saved.getId());
    }

    private ProjectCoverImage normalizeProjectCoverImage(byte[] sourceBytes) throws IOException {
        BufferedImage source = ImageIO.read(new ByteArrayInputStream(sourceBytes));
        if (source == null) {
            throw new IllegalArgumentException("Project image file must be a valid image");
        }

        BufferedImage fitted = renderProjectCover(source);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(fitted, "png", outputStream);
        return new ProjectCoverImage(outputStream.toByteArray(), "image/png");
    }

    private BufferedImage renderProjectCover(BufferedImage source) {
        BufferedImage target = new BufferedImage(PROJECT_IMAGE_WIDTH, PROJECT_IMAGE_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int sourceWidth = source.getWidth();
        int sourceHeight = source.getHeight();
        double scale = Math.max((double) PROJECT_IMAGE_WIDTH / sourceWidth, (double) PROJECT_IMAGE_HEIGHT / sourceHeight);
        int drawWidth = Math.max(1, (int) Math.round(sourceWidth * scale));
        int drawHeight = Math.max(1, (int) Math.round(sourceHeight * scale));
        int drawX = (PROJECT_IMAGE_WIDTH - drawWidth) / 2;
        int drawY = (PROJECT_IMAGE_HEIGHT - drawHeight) / 2;

        graphics.drawImage(source, drawX, drawY, drawWidth, drawHeight, null);
        graphics.dispose();
        return target;
    }

    private record ProjectCoverImage(byte[] bytes, String contentType) {
    }
}
