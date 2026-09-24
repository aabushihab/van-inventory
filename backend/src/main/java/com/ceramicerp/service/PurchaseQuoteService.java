package com.ceramicerp.service;

import com.ceramicerp.dto.InvoiceItemRequest;
import com.ceramicerp.dto.PurchaseInvoiceCreateRequest;
import com.ceramicerp.dto.PurchaseInvoiceDto;
import com.ceramicerp.dto.PurchaseQuoteCreateRequest;
import com.ceramicerp.dto.PurchaseQuoteDto;
import com.ceramicerp.dto.QuoteConfirmRequest;
import com.ceramicerp.dto.QuoteItemDto;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.*;
import com.ceramicerp.repository.*;
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
 * عروض أسعار الشراء: مستند تسعير من مورد لا يؤثر على المخزون، يتحول عند التأكيد إلى فاتورة شراء فعلية تزيد المخزون.
 * Purchase quotes: a supplier pricing document with no stock impact, converted on confirmation into a real purchase invoice that increases stock.
 */
@Service
@RequiredArgsConstructor
public class PurchaseQuoteService {

    private final PurchaseQuoteRepository purchaseQuoteRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final PurchaseInvoiceService purchaseInvoiceService;

    @Transactional(readOnly = true)
    public Page<PurchaseQuoteDto> findAll(Pageable pageable) {
        return purchaseQuoteRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseQuoteDto> search(Long supplierId, LocalDate from, LocalDate to, String q, Pageable pageable) {
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime toDateTime = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusYears(50);
        return purchaseQuoteRepository.search(supplierId, fromDateTime, toDateTime, q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public PurchaseQuoteDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public PurchaseQuoteDto create(PurchaseQuoteCreateRequest request, User actingUser) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Supplier supplier = request.supplierId() != null
                ? supplierRepository.findById(request.supplierId()).orElseThrow(() -> ApiException.notFound("المورد غير موجود"))
                : null;

        PurchaseQuote quote = PurchaseQuote.builder()
                .quoteNumber(generateQuoteNumber())
                .supplier(supplier).warehouse(warehouse).branch(branch)
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

            PurchaseQuoteItem item = PurchaseQuoteItem.builder()
                    .purchaseQuote(quote).product(product).warehouse(itemWarehouse)
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

        return toDto(purchaseQuoteRepository.save(quote));
    }

    @Transactional
    public PurchaseQuoteDto confirm(Long id, QuoteConfirmRequest request, User actingUser) {
        PurchaseQuote quote = getOrThrow(id);
        if (quote.getStatus() != QuoteStatus.PENDING) {
            throw ApiException.badRequest("لا يمكن تأكيد عرض سعر تم تأكيده أو إلغاؤه مسبقاً");
        }

        List<InvoiceItemRequest> itemRequests = quote.getItems().stream()
                .map(it -> new InvoiceItemRequest(it.getProduct().getId(),
                        it.getWarehouse() != null ? it.getWarehouse().getId() : null,
                        it.getQuantity(), it.getUnitPrice(), it.getTaxRate(), it.getDiscount()))
                .toList();

        PurchaseInvoiceCreateRequest invoiceRequest = new PurchaseInvoiceCreateRequest(
                quote.getSupplier() != null ? quote.getSupplier().getId() : null,
                quote.getWarehouse().getId(), quote.getBranch().getId(), itemRequests,
                request.paidAmount(), request.accountId(), quote.getNotes(), null
        );
        PurchaseInvoiceDto invoice = purchaseInvoiceService.create(invoiceRequest, actingUser);

        quote.setStatus(QuoteStatus.CONFIRMED);
        quote.setConvertedInvoice(purchaseInvoiceRepository.getReferenceById(invoice.id()));

        return toDto(purchaseQuoteRepository.save(quote));
    }

    @Transactional
    public void cancel(Long id) {
        PurchaseQuote quote = getOrThrow(id);
        if (quote.getStatus() != QuoteStatus.PENDING) {
            throw ApiException.badRequest("لا يمكن إلغاء عرض سعر تم تأكيده أو إلغاؤه مسبقاً");
        }
        quote.setStatus(QuoteStatus.CANCELLED);
        purchaseQuoteRepository.save(quote);
    }

    /** يحل مخزن السطر: المخزن المحدد صراحةً لهذا السطر إن وُجد، وإلا مخزن العرض الافتراضي. */
    private Warehouse resolveItemWarehouse(InvoiceItemRequest itemReq, Warehouse defaultWarehouse) {
        if (itemReq.warehouseId() == null || itemReq.warehouseId().equals(defaultWarehouse.getId())) {
            return defaultWarehouse;
        }
        return warehouseRepository.findById(itemReq.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن المحدد للصنف غير موجود"));
    }

    private String generateQuoteNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "PQ-" + datePart + "-" + suffix;
    }

    private PurchaseQuote getOrThrow(Long id) {
        return purchaseQuoteRepository.findById(id).orElseThrow(() -> ApiException.notFound("عرض السعر غير موجود"));
    }

    private PurchaseQuoteDto toDto(PurchaseQuote q) {
        List<QuoteItemDto> items = q.getItems().stream().map(it -> {
            Warehouse w = it.getWarehouse() != null ? it.getWarehouse() : q.getWarehouse();
            return new QuoteItemDto(
                    it.getId(), it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                    it.getProduct().getUnit().getName(), w.getId(), w.getName(),
                    it.getQuantity(), it.getUnitPrice(), it.getTaxRate(),
                    it.getDiscount(), it.getLineTotal()
            );
        }).toList();

        return new PurchaseQuoteDto(
                q.getId(), q.getQuoteNumber(),
                q.getSupplier() != null ? q.getSupplier().getId() : null,
                q.getSupplier() != null ? q.getSupplier().getName() : null,
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
