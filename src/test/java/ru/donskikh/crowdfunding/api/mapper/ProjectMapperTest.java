package ru.donskikh.crowdfunding.api.mapper;

import ru.donskikh.crowdfunding.api.dto.ProjectResponse;
import ru.donskikh.crowdfunding.domain.entity.CategoryEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import ru.donskikh.crowdfunding.domain.enums.ProjectStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectMapperTest {

    @Test
    void toResponseMapsProjectIncludingAuthorCategoryAndCoverFlag() {
        UUID projectId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        UserEntity author = new UserEntity();
        author.setId(authorId);
        author.setDisplayName("Alice");

        CategoryEntity category = new CategoryEntity();
        category.setId(7L);
        category.setTitle("Tech");

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setTitle("Drone");
        project.setShortDescription("Compact drone");
        project.setDescription("Long description");
        project.setGoalAmount(BigDecimal.valueOf(5000));
        project.setCollectedAmount(BigDecimal.valueOf(1200));
        project.setCurrency("RUB");
        project.setCoverImageContentType("image/png");
        project.setStatus(ProjectStatus.ACTIVE);
        project.setRejectionReason(null);
        project.setStartAt(now.plusDays(1));
        project.setEndAt(now.plusDays(30));
        project.setCreatedAt(now);
        project.setUpdatedAt(now.plusHours(1));
        project.setAuthor(author);
        project.setCategory(category);

        ProjectResponse response = ProjectMapper.toResponse(project);

        assertThat(response.getId()).isEqualTo(projectId);
        assertThat(response.getAuthorId()).isEqualTo(authorId);
        assertThat(response.getAuthorDisplayName()).isEqualTo("Alice");
        assertThat(response.getCategoryId()).isEqualTo(7L);
        assertThat(response.getCategoryTitle()).isEqualTo("Tech");
        assertThat(response.isHasCoverImage()).isTrue();
        assertThat(response.getStatus()).isEqualTo(ProjectStatus.ACTIVE);
    }

    @Test
    void toResponseLeavesOptionalRelationsEmptyWhenMissing() {
        ProjectEntity project = new ProjectEntity();
        project.setId(UUID.randomUUID());
        project.setTitle("No extras");
        project.setShortDescription("Short");
        project.setDescription("Description");
        project.setGoalAmount(BigDecimal.ONE);
        project.setCollectedAmount(BigDecimal.ZERO);
        project.setCurrency("RUB");
        project.setStatus(ProjectStatus.DRAFT);

        ProjectResponse response = ProjectMapper.toResponse(project);

        assertThat(response.getAuthorId()).isNull();
        assertThat(response.getAuthorDisplayName()).isNull();
        assertThat(response.getCategoryId()).isNull();
        assertThat(response.getCategoryTitle()).isNull();
        assertThat(response.isHasCoverImage()).isFalse();
    }
}
