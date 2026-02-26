plugins {
    java
    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"
description = "CrowdFunding"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Web (MVC)
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Data + DB
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("org.postgresql:postgresql")

    // Flyway migrations
    dependencies {
        implementation("org.flywaydb:flyway-core:11.3.0")
        implementation("org.flywaydb:flyway-database-postgresql:11.3.0")
    }

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Security (позже настроим permitAll/JWT)
    implementation("org.springframework.boot:spring-boot-starter-security")

    // OpenAPI UI (удобно для диплома и теста API)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.5.0")

    // Lombok (если хочешь)
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}