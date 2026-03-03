package com.example.crowdfunding.api.dto;

import java.math.BigDecimal;

public class ProjectStatisticsResponse {

    private BigDecimal totalAmount;  // Общая сумма пожертвований
    private Integer totalDonors;     // Количество доноров
    private BigDecimal goalAmount;   // Целевая сумма проекта
    private BigDecimal progress;     // Прогресс по сбору средств (сумма / цель)

    // Геттеры и сеттеры

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Integer getTotalDonors() { return totalDonors; }
    public void setTotalDonors(Integer totalDonors) { this.totalDonors = totalDonors; }

    public BigDecimal getGoalAmount() { return goalAmount; }
    public void setGoalAmount(BigDecimal goalAmount) { this.goalAmount = goalAmount; }

    public BigDecimal getProgress() { return progress; }
    public void setProgress(BigDecimal progress) { this.progress = progress; }
}