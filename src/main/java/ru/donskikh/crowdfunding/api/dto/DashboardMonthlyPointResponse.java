package ru.donskikh.crowdfunding.api.dto;

import java.math.BigDecimal;

public class DashboardMonthlyPointResponse {

    private String label;
    private BigDecimal amount;

    public DashboardMonthlyPointResponse() {
    }

    public DashboardMonthlyPointResponse(String label, BigDecimal amount) {
        this.label = label;
        this.amount = amount;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
