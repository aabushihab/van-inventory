package com.ceramicerp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * نقطة انطلاق نظام إدارة محلات السيراميك والبورسلان والحمامات.
 * Entry point for the Ceramic / Porcelain / Bathroom Shop ERP system.
 */
@SpringBootApplication
@EnableScheduling
public class CeramicErpApplication {
    public static void main(String[] args) {
        SpringApplication.run(CeramicErpApplication.class, args);
    }
}
