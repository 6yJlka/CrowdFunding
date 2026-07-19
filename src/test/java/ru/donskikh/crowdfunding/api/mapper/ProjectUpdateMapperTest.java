package ru.donskikh.crowdfunding.api.mapper;

import ru.donskikh.crowdfunding.domain.entity.ProjectEntity;
import ru.donskikh.crowdfunding.domain.entity.ProjectUpdateEntity;
import ru.donskikh.crowdfunding.domain.entity.UserEntity;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectUpdateMapperTest {

    @Test
    void mapsUpdateFields() {
        UUID projectId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now();

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);

        UserEntity author = new UserEntity();
        author.setId(authorId);
        author.setDisplayName("Author");

        ProjectUpdateEntity update = new ProjectUpdateEntity();
        update.setId(UUID.randomUUID());
        update.setProject(project);
        update.setAuthor(author);
        update.setTitle("Milestone");
        update.setContent("We shipped it");
        update.setCreatedAt(createdAt);

        var response = ProjectUpdateMapper.toResponse(update);

        assertThat(response.getProjectId()).isEqualTo(projectId);
        assertThat(response.getAuthorId()).isEqualTo(authorId);
        assertThat(response.getAuthorDisplayName()).isEqualTo("Author");
        assertThat(response.getTitle()).isEqualTo("Milestone");
        assertThat(response.getContent()).isEqualTo("We shipped it");
        assertThat(response.getCreatedAt()).isEqualTo(createdAt);
    }
}
