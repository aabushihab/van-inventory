package com.vanerp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * نقطة انطلاق نظام المخازن والمبيعات وتحميل سيارات التوزيع.
 * Entry point for the Warehouse, Sales & Van Distribution system.
 */
@SpringBootApplication
@EnableScheduling
public class VanErpApplication {
    public static void main(String[] args) {
        SpringApplication.run(VanErpApplication.class, args);
    }
}
