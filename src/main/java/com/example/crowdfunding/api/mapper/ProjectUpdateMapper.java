package com.example.crowdfunding.api.mapper;

import com.example.crowdfunding.api.dto.ProjectUpdateResponse;
import com.example.crowdfunding.domain.entity.ProjectUpdateEntity;

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