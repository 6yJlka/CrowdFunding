package com.example.crowdfunding;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;

class CrowdFundingApplicationMainTest {

    @Test
    void mainDelegatesToSpringApplication() {
        try (MockedStatic<SpringApplication> springApplication = Mockito.mockStatic(SpringApplication.class)) {
            CrowdFundingApplication.main(new String[]{"--test"});

            springApplication.verify(() -> SpringApplication.run(CrowdFundingApplication.class, new String[]{"--test"}));
        }
    }
}
