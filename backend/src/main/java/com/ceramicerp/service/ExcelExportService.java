package com.ceramicerp.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * أداة عامة لتصدير أي جدول بيانات إلى ملف Excel حقيقي (.xlsx)، بترويسة عريضة واتجاه من اليمين لليسار.
 * Generic helper to export any tabular data to a real .xlsx file, with a bold header row and RTL sheet direction.
 */
@Service
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] build(String sheetName, List<String> headers, List<List<Object>> rows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName));
            sheet.setRightToLeft(true);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                List<Object> rowData = rows.get(r);
                for (int c = 0; c < rowData.size(); c++) {
                    setCellValue(row.createCell(c), rowData.get(c));
                }
            }

            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
                // حد أقصى وأدنى لعرض العمود حتى لا يظهر ضيقاً جداً أو عريضاً جداً بالنصوص العربية الطويلة
                int width = Math.max(sheet.getColumnWidth(i), 12 * 256);
                sheet.setColumnWidth(i, Math.min(width, 60 * 256));
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void setCellValue(Cell cell, Object value) {
        if (value == null) {
            cell.setCellValue("");
        } else if (value instanceof BigDecimal bd) {
            cell.setCellValue(bd.doubleValue());
        } else if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else if (value instanceof LocalDateTime dt) {
            cell.setCellValue(dt.format(DATETIME_FORMAT));
        } else if (value instanceof LocalDate d) {
            cell.setCellValue(d.format(DATE_FORMAT));
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }

    private String sanitizeSheetName(String name) {
        String cleaned = name.replaceAll("[\\\\/*?\\[\\]:]", " ");
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }
}
