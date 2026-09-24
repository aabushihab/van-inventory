package com.vanerp.dto;

import java.math.BigDecimal;

public record VanDto(
        Long id,
        String code,
        String name,
        String plateNumber,
        Long driverId,
        String driverName,
        String driverPhone,
        Long salesmanId,
        String salesmanName,
        Long warehouseId,
        String warehouseName,
        Long branchId,
        Long cashAccountId,
        String cashAccountName,
        String notes,
        boolean active,
        BigDecimal stockQuantity,
        BigDecimal stockValue,
        long todayInvoiceCount,
        BigDecimal todaySalesTotal,
        BigDecimal pendingShortageValue
) {}
