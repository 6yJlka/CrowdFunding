package com.example.crowdfunding.domain.entity;

import com.example.crowdfunding.domain.enums.DonationStatus;
import com.example.crowdfunding.domain.enums.ProjectStatus;
import com.example.crowdfunding.domain.enums.UserStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class EntityLifecycleTest {

    @Test
    void userEntityPrePersistSetsDefaultsAndPreUpdateRefreshesTimestamp() {
        UserEntity entity = new UserEntity();
        entity.prePersist();
        var createdAt = entity.getCreatedAt();
        var updatedAt = entity.getUpdatedAt();

        assertThat(entity.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(createdAt).isNotNull();
        assertThat(updatedAt).isNotNull();

        entity.preUpdate();
        assertThat(entity.getUpdatedAt()).isAfterOrEqualTo(updatedAt);
    }

    @Test
    void projectEntityPrePersistSetsDefaultsAndPreUpdateRefreshesTimestamp() {
        ProjectEntity entity = new ProjectEntity();
        entity.prePersist();
        var updatedAt = entity.getUpdatedAt();

        assertThat(entity.getCurrency()).isEqualTo("RUB");
        assertThat(entity.getCollectedAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(entity.getStatus()).isEqualTo(ProjectStatus.DRAFT);
        assertThat(entity.getCreatedAt()).isNotNull();
        assertThat(updatedAt).isNotNull();

        entity.preUpdate();
        assertThat(entity.getUpdatedAt()).isAfterOrEqualTo(updatedAt);
    }

    @Test
    void donationEntityPrePersistSetsDefaults() {
        DonationEntity entity = new DonationEntity();

        entity.prePersist();

        assertThat(entity.getCreatedAt()).isNotNull();
        assertThat(entity.getStatus()).isEqualTo(DonationStatus.PENDING);
    }

    @Test
    void commentEntityPrePersistSetsTimestamp() {
        CommentEntity entity = new CommentEntity();

        entity.prePersist();

        assertThat(entity.getCreatedAt()).isNotNull();
    }

    @Test
    void projectReviewEntityPrePersistSetsTimestamp() {
        ProjectReviewEntity entity = new ProjectReviewEntity();

        entity.prePersist();

        assertThat(entity.getCreatedAt()).isNotNull();
    }

    @Test
    void projectUpdateEntityPrePersistSetsTimestamp() {
        ProjectUpdateEntity entity = new ProjectUpdateEntity();

        entity.prePersist();

        assertThat(entity.getCreatedAt()).isNotNull();
    }
}
