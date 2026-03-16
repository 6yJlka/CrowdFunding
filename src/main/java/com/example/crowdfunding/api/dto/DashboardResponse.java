package com.example.crowdfunding.api.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DashboardResponse {

    private BigDecimal totalRaised = BigDecimal.ZERO;
    private long activeProjects;
    private long totalBackers;
    private long fundedProjects;
    private List<DashboardMonthlyPointResponse> monthlyRaised = new ArrayList<>();
    private List<DashboardProjectRowResponse> topProjects = new ArrayList<>();
    private List<DashboardFounderResponse> recentFounders = new ArrayList<>();

    public BigDecimal getTotalRaised() {
        return totalRaised;
    }

    public void setTotalRaised(BigDecimal totalRaised) {
        this.totalRaised = totalRaised;
    }

    public long getActiveProjects() {
        return activeProjects;
    }

    public void setActiveProjects(long activeProjects) {
        this.activeProjects = activeProjects;
    }

    public long getTotalBackers() {
        return totalBackers;
    }

    public void setTotalBackers(long totalBackers) {
        this.totalBackers = totalBackers;
    }

    public long getFundedProjects() {
        return fundedProjects;
    }

    public void setFundedProjects(long fundedProjects) {
        this.fundedProjects = fundedProjects;
    }

    public List<DashboardMonthlyPointResponse> getMonthlyRaised() {
        return monthlyRaised;
    }

    public void setMonthlyRaised(List<DashboardMonthlyPointResponse> monthlyRaised) {
        this.monthlyRaised = monthlyRaised;
    }

    public List<DashboardProjectRowResponse> getTopProjects() {
        return topProjects;
    }

    public void setTopProjects(List<DashboardProjectRowResponse> topProjects) {
        this.topProjects = topProjects;
    }

    public List<DashboardFounderResponse> getRecentFounders() {
        return recentFounders;
    }

    public void setRecentFounders(List<DashboardFounderResponse> recentFounders) {
        this.recentFounders = recentFounders;
    }
}
