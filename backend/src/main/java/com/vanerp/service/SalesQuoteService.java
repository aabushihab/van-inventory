package com.vanerp.service;

import com.vanerp.dto.InvoiceItemRequest;
import com.vanerp.dto.QuoteConfirmRequest;
import com.vanerp.dto.QuoteItemDto;
import com.vanerp.dto.SalesInvoiceCreateRequest;
import com.vanerp.dto.SalesInvoiceDto;
import com.vanerp.dto.SalesQuoteCreateRequest;
import com.vanerp.dto.SalesQuoteDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * عروض أسعار البيع: مستند تسعير لا يؤثر على المخزون، يتحول عند التأكيد إلى فاتورة بيع فعلية تخصم المخزون.
 * Sales quotes: a pricing document with no stock impact, converted on confirmation into a real sales invoice that deducts stock.
 */
@Service
@RequiredArgsConstructor
public class SalesQuoteService {

    private final SalesQuoteRepository salesQuoteRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final CustomerRepository customerRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final SalesInvoiceService salesInvoiceService;

    @Transactional(readOnly = true)
    public Page<SalesQuoteDto> findAll(Pageable pageable) {
        return salesQuoteRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<SalesQuoteDto> search(Long customerId, LocalDate from, LocalDate to, String q, Pageable pageable) {
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime toDateTime = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusYears(50);
        return salesQuoteRepository.search(customerId, fromDateTime, toDateTime, q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public SalesQuoteDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public SalesQuoteDto create(SalesQuoteCreateRequest request, User actingUser) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Customer customer = request.customerId() != null
                ? customerRepository.findById(request.customerId()).orElseThrow(() -> ApiException.notFound("العميل غير موجود"))
                : null;

        for (InvoiceItemRequest itemReq : request.items()) {
            validateAvailability(itemReq, resolveItemWarehouse(itemReq, warehouse));
        }

        SalesQuote quote = SalesQuote.builder()
                .quoteNumber(generateQuoteNumber())
                .customer(customer).warehouse(warehouse).branch(branch)
                .status(QuoteStatus.PENDING)
                .notes(request.notes())
                .createdBy(actingUser)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO, taxTotal = BigDecimal.ZERO, discountTotal = BigDecimal.ZERO;
        for (InvoiceItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> ApiException.notFound("منتج غير موجود ضمن عناصر عرض السعر"));
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, warehouse);

            BigDecimal tax = itemReq.taxRate() != null ? itemReq.taxRate() : product.getTaxRate();
            BigDecimal discount = itemReq.discount() != null ? itemReq.discount() : BigDecimal.ZERO;
            BigDecimal grossLine = itemReq.quantity().multiply(itemReq.unitPrice()).setScale(3, RoundingMode.HALF_UP);
            BigDecimal lineBase = grossLine.subtract(discount);
            BigDecimal lineTax = lineBase.multiply(tax).divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineBase.add(lineTax);

            SalesQuoteItem item = SalesQuoteItem.builder()
                    .salesQuote(quote).product(product).warehouse(itemWarehouse)
                    .quantity(itemReq.quantity()).unitPrice(itemReq.unitPrice())
                    .taxRate(tax).discount(discount).lineTotal(lineTotal)
                    .build();
            quote.getItems().add(item);

            subtotal = subtotal.add(grossLine);
            taxTotal = taxTotal.add(lineTax);
            discountTotal = discountTotal.add(discount);
        }

        quote.setSubtotal(subtotal);
        quote.setTaxTotal(taxTotal);
        quote.setDiscountTotal(discountTotal);
        quote.setGrandTotal(subtotal.subtract(discountTotal).add(taxTotal));

        return toDto(salesQuoteRepository.save(quote));
    }

    /**
     * تأكيد عرض السعر: يعيد التحقق من توفر الكمية (قد يكون المخزون تغيّر منذ إنشاء العرض) ثم يُنشئ فاتورة بيع
     * فعلية بنفس بيانات العرض، وتُخصم الكمية من المخزون عندها فقط.
     */
    @Transactional
    public SalesQuoteDto confirm(Long id, QuoteConfirmRequest request, User actingUser) {
        SalesQuote quote = getOrThrow(id);
        if (quote.getStatus() != QuoteStatus.PENDING) {
            throw ApiException.badRequest("لا يمكن تأكيد عرض سعر تم تأكيده أو إلغاؤه مسبقاً");
        }

        List<InvoiceItemRequest> itemRequests = quote.getItems().stream()
                .map(it -> new InvoiceItemRequest(it.getProduct().getId(),
                        it.getWarehouse() != null ? it.getWarehouse().getId() : null,
                        it.getQuantity(), it.getUnitPrice(), it.getTaxRate(), it.getDiscount()))
                .toList();

        SalesInvoiceCreateRequest invoiceRequest = new SalesInvoiceCreateRequest(
                quote.getCustomer() != null ? quote.getCustomer().getId() : null,
                quote.getWarehouse().getId(), quote.getBranch().getId(), itemRequests,
                request.paidAmount(), request.paymentMethod(), request.accountId(), quote.getNotes(), null
        );
        SalesInvoiceDto invoice = salesInvoiceService.create(invoiceRequest, actingUser);

        quote.setStatus(QuoteStatus.CONFIRMED);
        quote.setConvertedInvoice(salesInvoiceRepository.getReferenceById(invoice.id()));

        return toDto(salesQuoteRepository.save(quote));
    }

    @Transactional
    public void cancel(Long id) {
        SalesQuote quote = getOrThrow(id);
        if (quote.getStatus() != QuoteStatus.PENDING) {
            throw ApiException.badRequest("لا يمكن إلغاء عرض سعر تم تأكيده أو إلغاؤه مسبقاً");
        }
        quote.setStatus(QuoteStatus.CANCELLED);
        salesQuoteRepository.save(quote);
    }

    /** يحل مخزن السطر: المخزن المحدد صراحةً لهذا السطر إن وُجد، وإلا مخزن العرض الافتراضي. */
    private Warehouse resolveItemWarehouse(InvoiceItemRequest itemReq, Warehouse defaultWarehouse) {
        if (itemReq.warehouseId() == null || itemReq.warehouseId().equals(defaultWarehouse.getId())) {
            return defaultWarehouse;
        }
        return warehouseRepository.findById(itemReq.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن المحدد للصنف غير موجود"));
    }

    private void validateAvailability(InvoiceItemRequest itemReq, Warehouse warehouse) {
        BigDecimal available = stockService.getQuantity(itemReq.productId(), warehouse.getId());
        if (available.compareTo(itemReq.quantity()) < 0) {
            Product p = productRepository.findById(itemReq.productId()).orElse(null);
            String name = p != null ? p.getName() : ("#" + itemReq.productId());
            throw ApiException.badRequest("الكمية المتوفرة من \"" + name + "\" غير كافية (المتوفر: "
                    + available.stripTrailingZeros().toPlainString() + ")");
        }
    }

    private String generateQuoteNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "SQ-" + datePart + "-" + suffix;
    }

    private SalesQuote getOrThrow(Long id) {
        return salesQuoteRepository.findById(id).orElseThrow(() -> ApiException.notFound("عرض السعر غير موجود"));
    }

    private SalesQuoteDto toDto(SalesQuote q) {
        List<QuoteItemDto> items = q.getItems().stream().map(it -> {
            Warehouse w = it.getWarehouse() != null ? it.getWarehouse() : q.getWarehouse();
            return new QuoteItemDto(
                    it.getId(), it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                    it.getProduct().getUnit().getName(), w.getId(), w.getName(),
                    it.getQuantity(), it.getUnitPrice(), it.getTaxRate(),
                    it.getDiscount(), it.getLineTotal()
            );
        }).toList();

        return new SalesQuoteDto(
                q.getId(), q.getQuoteNumber(),
                q.getCustomer() != null ? q.getCustomer().getId() : null,
                q.getCustomer() != null ? q.getCustomer().getName() : null,
                q.getWarehouse().getId(), q.getWarehouse().getName(),
                q.getBranch().getId(), q.getBranch().getName(),
                q.getStatus().name(), q.getSubtotal(), q.getTaxTotal(), q.getDiscountTotal(), q.getGrandTotal(),
                q.getNotes(),
                q.getConvertedInvoice() != null ? q.getConvertedInvoice().getId() : null,
                q.getConvertedInvoice() != null ? q.getConvertedInvoice().getInvoiceNumber() : null,
                q.getCreatedBy() != null ? q.getCreatedBy().getFullName() : null,
                q.getCreatedAt(), items
        );
    }
}
