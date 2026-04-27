package com.example.crowdfunding.controller;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PingControllerTest {

    @Test
    void returnsPong() {
        assertThat(new PingController().ping()).isEqualTo("pong");
    }
}
