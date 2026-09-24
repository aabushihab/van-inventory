package com.ceramicerp.pdf;

import com.ceramicerp.service.CompanySettingsService;
import com.openhtmltopdf.bidi.support.ICUBidiReorderer;
import com.openhtmltopdf.bidi.support.ICUBidiSplitter;
import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Locale;

/**
 * توليد ملفات PDF للفواتير: صيغة A4 للطباعة العادية، وصيغة إيصال حراري (58/80mm).
 * Generates invoice PDFs: A4 format for regular printers, and thermal receipt format (58/80mm).
 */
@Service
@RequiredArgsConstructor
public class PdfInvoiceService {

    private final SpringTemplateEngine templateEngine;
    private final CompanySettingsService companySettingsService;

    public String getCompanyName() { return companySettingsService.get().name(); }
    public String getCompanyNameEn() { return companySettingsService.get().nameEn(); }
    public String getCompanyPhone() { return companySettingsService.get().phone(); }
    public String getCompanyAddress() { return companySettingsService.get().address(); }
    public String getCompanyTaxNumber() { return companySettingsService.get().taxNumber(); }
    public String getCurrency() { return companySettingsService.get().currency(); }

    // نستخدم Locale.US دائماً لتنسيق الأرقام في الفاتورة (فاصلة عشرية "." ثابتة) بصرف النظر عن لغة السيرفر
    // الافتراضية، لتفادي ظهور الفاصلة العشرية العربية (٫) التي قد تظهر كرمز غير مقروء في بعض العارضات.
    public byte[] renderA4(InvoicePrintModel model) {
        Context context = new Context(Locale.US);
        context.setVariable("model", model);
        String html = templateEngine.process("pdf/a4-invoice", context);
        return renderPdf(html);
    }

    public byte[] renderThermal(InvoicePrintModel model, int widthMm) {
        Context context = new Context(Locale.US);
        context.setVariable("model", model);
        context.setVariable("widthMm", widthMm);
        String html = templateEngine.process("pdf/thermal-receipt", context);
        return renderPdf(html);
    }

    public byte[] renderVoucher(VoucherPrintModel model) {
        Context context = new Context(Locale.US);
        context.setVariable("model", model);
        String html = templateEngine.process("pdf/salary-voucher", context);
        return renderPdf(html);
    }

    private byte[] renderPdf(String html) {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);

            // دعم العربية: فصل وإعادة ترتيب النص ثنائي الاتجاه (RTL) + تشكيل الحروف المتصلة
            builder.useUnicodeBidiSplitter(new ICUBidiSplitter.ICUBidiSplitterFactory());
            builder.useUnicodeBidiReorderer(new ICUBidiReorderer());
            builder.defaultTextDirection(PdfRendererBuilder.TextDirection.RTL);

            registerFont(builder, "/fonts/NotoNaskhArabic-Regular.ttf", "Noto Naskh Arabic", 400);
            registerFont(builder, "/fonts/NotoNaskhArabic-Bold.ttf", "Noto Naskh Arabic", 700);
            registerFont(builder, "/fonts/NotoSans-Regular.ttf", "Noto Sans", 400);
            registerFont(builder, "/fonts/NotoSans-Bold.ttf", "Noto Sans", 700);

            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("تعذر توليد ملف PDF للفاتورة: " + e.getMessage(), e);
        }
    }

    private void registerFont(PdfRendererBuilder builder, String classpathPath, String family, int weight) {
        FSSupplier<InputStream> supplier = () -> getClass().getResourceAsStream(classpathPath);
        builder.useFont(supplier, family, weight, PdfRendererBuilder.FontStyle.NORMAL, true);
    }
}
