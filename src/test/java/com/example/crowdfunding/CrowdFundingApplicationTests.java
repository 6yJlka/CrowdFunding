package com.example.crowdfunding;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import static org.assertj.core.api.Assertions.assertThat;

class CrowdFundingApplicationTests {

    @Test
    void applicationClassIsSpringBootApplication() {
        assertThat(CrowdFundingApplication.class)
                .hasAnnotation(SpringBootApplication.class);
    }
}
