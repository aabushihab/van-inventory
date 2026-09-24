package com.ceramicerp.controller;

import com.ceramicerp.dto.AgingBucketDto;
import com.ceramicerp.dto.BalanceSheetDto;
import com.ceramicerp.dto.FinancialPeriodDto;
import com.ceramicerp.dto.InventoryValueDto;
import com.ceramicerp.dto.StockMovementSummaryDto;
import com.ceramicerp.dto.TaxPayableSummaryDto;
import com.ceramicerp.dto.TopPartyDto;
import com.ceramicerp.dto.TopProductDto;
import com.ceramicerp.service.ExcelExportService;
import com.ceramicerp.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('REPORTS_VIEW')")
public class ReportController {

    private final ReportService reportService;
    private final ExcelExportService excelExportService;

    @GetMapping("/financial")
    public List<FinancialPeriodDto> financial(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy) {
        return reportService.financialReport(from, to, groupBy);
    }

    @GetMapping("/inventory-value")
    public List<InventoryValueDto> inventoryValue(@RequestParam(required = false) Long warehouseId) {
        return reportService.inventoryValue(warehouseId);
    }

    @GetMapping("/top-products")
    public List<TopProductDto> topProducts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return reportService.topProducts(from, to, limit);
    }

    @GetMapping("/top-customers")
    public List<TopPartyDto> topCustomers(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return reportService.topCustomers(from, to, limit);
    }

    @GetMapping("/top-suppliers")
    public List<TopPartyDto> topSuppliers(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return reportService.topSuppliers(from, to, limit);
    }

    @GetMapping("/stock-movement-summary")
    public List<StockMovementSummaryDto> stockMovementSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy,
            @RequestParam(required = false) Long warehouseId) {
        return reportService.stockMovementSummary(from, to, groupBy, warehouseId);
    }

    @GetMapping("/tax-payable")
    public TaxPayableSummaryDto taxPayable(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.taxPayableSummary(from, to);
    }

    @GetMapping("/balance-sheet")
    public BalanceSheetDto balanceSheet() {
        return reportService.balanceSheet();
    }

    @GetMapping("/receivables-aging")
    public List<AgingBucketDto> receivablesAging() {
        return reportService.receivablesAging();
    }

    @GetMapping("/payables-aging")
    public List<AgingBucketDto> payablesAging() {
        return reportService.payablesAging();
    }

    @GetMapping("/cash-flow")
    public com.ceramicerp.dto.CashFlowStatementDto cashFlow(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.cashFlowStatement(from, to);
    }

    @GetMapping("/financial/export")
    public ResponseEntity<byte[]> exportFinancial(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String groupBy) {
        List<FinancialPeriodDto> data = reportService.financialReport(from, to, groupBy);
        List<String> headers = List.of("الفترة", "عدد الفواتير", "إجمالي المبيعات", "الخصم",
                "تكلفة البضاعة المباعة", "خسارة التوالف", "المصاريف", "إجمالي الربح", "إجمالي المشتريات");
        List<List<Object>> rows = new ArrayList<>();
        for (FinancialPeriodDto d : data) {
            rows.add(List.of(d.period(), d.salesCount(), d.salesTotal(), d.discountTotal(),
                    d.costOfGoodsSold(), d.damagedLoss(), d.expensesTotal(), d.grossProfit(), d.purchasesTotal()));
        }
        return excelResponse(excelExportService.build("التقرير المالي", headers, rows), "التقرير-المالي.xlsx");
    }

    @GetMapping("/inventory-value/export")
    public ResponseEntity<byte[]> exportInventoryValue(@RequestParam(required = false) Long warehouseId) {
        List<InventoryValueDto> data = reportService.inventoryValue(warehouseId);
        List<String> headers = List.of("المخزن", "الرمز", "الاسم", "الكمية", "تكلفة الوحدة", "القيمة");
        List<List<Object>> rows = new ArrayList<>();
        for (InventoryValueDto d : data) {
            rows.add(List.of(d.warehouseName(), d.sku(), d.productName(), d.quantity(), d.unitCost(), d.value()));
        }
        return excelResponse(excelExportService.build("قيمة المخزون", headers, rows), "قيمة-المخزون.xlsx");
    }

    @GetMapping("/top-products/export")
    public ResponseEntity<byte[]> exportTopProducts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "50") int limit) {
        List<TopProductDto> data = reportService.topProducts(from, to, limit);
        List<String> headers = List.of("الرمز", "الاسم", "الكمية المباعة", "الإيراد");
        List<List<Object>> rows = new ArrayList<>();
        for (TopProductDto d : data) {
            rows.add(List.of(d.sku(), d.productName(), d.totalQuantity(), d.totalRevenue()));
        }
        return excelResponse(excelExportService.build("الأكثر مبيعاً", headers, rows), "الأكثر-مبيعاً.xlsx");
    }

    private ResponseEntity<byte[]> excelResponse(byte[] content, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        // اسم الملف عربي - setContentDispositionFormData يفشل بصمت لأنه يفترض ISO-8859-1، فنستخدم
        // ترميز RFC 5987 (filename*=UTF-8''...) الذي يدعمه ContentDisposition.Builder بشكل صحيح.
        headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename(filename, java.nio.charset.StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(headers).body(content);
    }
}
