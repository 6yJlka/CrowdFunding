package ru.donskikh.crowdfunding.api.controller;

import ru.donskikh.crowdfunding.api.dto.PublicFounderResponse;
import ru.donskikh.crowdfunding.api.dto.PublicReviewFeedResponse;
import ru.donskikh.crowdfunding.api.dto.PublicSponsorResponse;
import ru.donskikh.crowdfunding.api.dto.UserAvatarResponse;
import ru.donskikh.crowdfunding.service.PublicShowcaseService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase")
public class PublicShowcaseController {

    private final PublicShowcaseService publicShowcaseService;

    public PublicShowcaseController(PublicShowcaseService publicShowcaseService) {
        this.publicShowcaseService = publicShowcaseService;
    }

    @GetMapping("/founders")
    public Page<PublicFounderResponse> founders(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getFounders(q, pageable);
    }

    @GetMapping("/founders/{authorId}/avatar")
    public ResponseEntity<byte[]> founderAvatar(@PathVariable("authorId") java.util.UUID authorId) {
        UserAvatarResponse avatar = publicShowcaseService.getFounderAvatar(authorId);
        MediaType mediaType = MediaType.parseMediaType(avatar.getContentType());

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(avatar.getBytes());
    }

    @GetMapping("/sponsors")
    public Page<PublicSponsorResponse> sponsors(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getSponsors(q, pageable);
    }

    @GetMapping("/sponsors/{sponsorId}/avatar")
    public ResponseEntity<byte[]> sponsorAvatar(@PathVariable("sponsorId") java.util.UUID sponsorId) {
        UserAvatarResponse avatar = publicShowcaseService.getSponsorAvatar(sponsorId);
        MediaType mediaType = MediaType.parseMediaType(avatar.getContentType());

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(avatar.getBytes());
    }

    @GetMapping("/reviews")
    public Page<PublicReviewFeedResponse> reviews(
            @RequestParam(name = "q", required = false) String q,
            Pageable pageable
    ) {
        return publicShowcaseService.getReviews(q, pageable);
    }
}
