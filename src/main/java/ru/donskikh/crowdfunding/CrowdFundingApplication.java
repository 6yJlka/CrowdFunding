package ru.donskikh.crowdfunding;

import ru.donskikh.crowdfunding.config.BootstrapAdminProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(BootstrapAdminProperties.class)
public class CrowdFundingApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrowdFundingApplication.class, args);
    }

}
