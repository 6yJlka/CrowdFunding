package com.example.crowdfunding.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ProjectReviewRequest {

    @Min(1)
    @Max(5)
    private Short rating;  // Рейтинг от 1 до 5

    @NotBlank
    @Size(max = 10000)
    private String reviewText;  // Текст отзыва

    public Short getRating() { return rating; }
    public void setRating(Short rating) { this.rating = rating; }

    public String getReviewText() { return reviewText; }
    public void setReviewText(String reviewText) { this.reviewText = reviewText; }
}