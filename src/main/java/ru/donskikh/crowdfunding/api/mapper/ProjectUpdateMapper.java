package ru.donskikh.crowdfunding.api.mapper;

import ru.donskikh.crowdfunding.api.dto.ProjectUpdateResponse;
import ru.donskikh.crowdfunding.domain.entity.ProjectUpdateEntity;

public class ProjectUpdateMapper {

    public static ProjectUpdateResponse toResponse(ProjectUpdateEntity e) {
        ProjectUpdateResponse r = new ProjectUpdateResponse();
        r.setId(e.getId());
        r.setProjectId(e.getProject().getId());
        r.setAuthorId(e.getAuthor().getId());
        r.setAuthorDisplayName(e.getAuthor().getDisplayName());
        r.setTitle(e.getTitle());
        r.setContent(e.getContent());
        r.setCreatedAt(e.getCreatedAt());
        return r;
    }
}