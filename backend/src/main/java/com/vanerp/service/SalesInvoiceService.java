package com.vanerp.service;

import com.vanerp.dto.InvoiceItemDto;
import com.vanerp.dto.InvoiceItemRequest;
import com.vanerp.dto.PartyBalanceDto;
import com.vanerp.dto.PaymentDto;
import com.vanerp.dto.SalesInvoiceCreateRequest;
import com.vanerp.dto.SalesInvoiceDto;
import com.vanerp.dto.SalesPaymentRequest;
import com.vanerp.dto.SalesRefundRequest;
import com.vanerp.dto.SalesReturnDto;
import com.vanerp.dto.SalesReturnItemDto;
import com.vanerp.dto.SalesReturnItemRequest;
import com.vanerp.dto.SalesReturnRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SalesInvoiceService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesReturnRepository salesReturnRepository;
    private final SalesInvoicePaymentRepository salesInvoicePaymentRepository;
    private final CustomerRepository customerRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final AccountService accountService;
    private final FiscalYearClosingService fiscalYearClosingService;
    private final VanAccessService vanAccessService;

    /** يمنع تعديل/إلغاء/إرجاع فاتورة تاريخها ضمن فترة مالية مقفلة - نفس حارس AccountService.recordTransaction. */
    private void guardNotClosed(SalesInvoice invoice) {
        fiscalYearClosingService.latestClosingDate()
                .filter(closed -> !invoice.getCreatedAt().toLocalDate().isAfter(closed))
                .ifPresent(closed -> {
                    throw ApiException.badRequest("لا يمكن تعديل فاتورة بتاريخ ضمن فترة مالية مقفلة (حتى " + closed + ")");
                });
    }

    @Transactional(readOnly = true)
    public Page<SalesInvoiceDto> findAll(Pageable pageable) {
        return salesInvoiceRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<SalesInvoiceDto> search(Long customerId, InvoiceStatus status, LocalDate from, LocalDate to, String q, Pageable pageable) {
        return search(customerId, null, status, from, to, q, pageable);
    }

    /** نفس البحث مع حصر النتائج بمخزن معيّن (فواتير سيارة المندوب فقط). */
    @Transactional(readOnly = true)
    public Page<SalesInvoiceDto> search(Long customerId, Long warehouseId, InvoiceStatus status, LocalDate from, LocalDate to,
                                        String q, Pageable pageable) {
        // نتجنب تمرير NULL لمعاملات التاريخ لأن PostgreSQL/PgJDBC لا يستطيع استنتاج نوعها في حالة NULL
        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime toDateTime = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusYears(50);
        return salesInvoiceRepository.search(customerId, warehouseId, status, fromDateTime, toDateTime, q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public SalesInvoiceDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public SalesInvoiceDto create(SalesInvoiceCreateRequest request, User actingUser) {
        vanAccessService.enforceSalesmanWarehouse(actingUser, request);
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Customer customer = request.customerId() != null
                ? customerRepository.findById(request.customerId()).orElseThrow(() -> ApiException.notFound("العميل غير موجود"))
                : null;

        PaymentMethod paymentMethod = parsePaymentMethod(request.paymentMethod());

        // تحقق مسبق من كفاية الكمية بكل مخزن مطلوب قبل تنفيذ أي حركة لتفادي فاتورة منقوصة التنفيذ
        for (InvoiceItemRequest itemReq : request.items()) {
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, warehouse);
            BigDecimal available = stockService.getQuantity(itemReq.productId(), itemWarehouse.getId());
            if (available.compareTo(itemReq.quantity()) < 0) {
                Product p = productRepository.findById(itemReq.productId()).orElse(null);
                String name = p != null ? p.getName() : ("#" + itemReq.productId());
                throw ApiException.badRequest("الكمية المتوفرة من \"" + name + "\" في مخزن \"" + itemWarehouse.getName()
                        + "\" غير كافية (المتوفر: " + available.stripTrailingZeros().toPlainString() + ")");
            }
        }

        SalesInvoice invoice = SalesInvoice.builder()
                .invoiceNumber(generateInvoiceNumber())
                .customer(customer).warehouse(warehouse).branch(branch)
                .status(InvoiceStatus.CONFIRMED)
                .paymentMethod(paymentMethod)
                .paidAmount(request.paidAmount() != null ? request.paidAmount() : BigDecimal.ZERO)
                .notes(request.notes())
                .dueDate(request.dueDate())
                .createdBy(actingUser)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO, taxTotal = BigDecimal.ZERO, discountTotal = BigDecimal.ZERO;

        for (InvoiceItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> ApiException.notFound("منتج غير موجود ضمن عناصر الفاتورة"));
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, warehouse);

            BigDecimal tax = itemReq.taxRate() != null ? itemReq.taxRate() : product.getTaxRate();
            BigDecimal discount = itemReq.discount() != null ? itemReq.discount() : BigDecimal.ZERO;
            // كل حد يُقرَّب لثلاث خانات عشرية (مطابقة لدقة عمود قاعدة البيانات) قبل التجميع، بحيث يبقى
            // إجمالي الفاتورة مطابقاً تماماً لمجموع أسطرها المعروضة دائماً، بدل تراكم فروق تقريب طفيفة.
            BigDecimal grossLine = itemReq.quantity().multiply(itemReq.unitPrice()).setScale(3, RoundingMode.HALF_UP);
            BigDecimal lineBase = grossLine.subtract(discount);
            BigDecimal lineTax = lineBase.multiply(tax).divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineBase.add(lineTax);

            SalesInvoiceItem item = SalesInvoiceItem.builder()
                    .salesInvoice(invoice).product(product).warehouse(itemWarehouse)
                    .quantity(itemReq.quantity()).unitPrice(itemReq.unitPrice())
                    .taxRate(tax).discount(discount).lineTotal(lineTotal)
                    .unitCost(product.getPurchasePrice())
                    .build();
            invoice.getItems().add(item);

            subtotal = subtotal.add(grossLine);
            taxTotal = taxTotal.add(lineTax);
            discountTotal = discountTotal.add(discount);

            // فاتورة البيع تنقص المخزون - وقد تُطلق تنبيه نقصان مخزون تلقائياً
            stockService.applyMovement(product, itemWarehouse, itemReq.quantity().negate(), MovementType.SALE_OUT,
                    "SALES_INVOICE", null, "فاتورة بيع", actingUser);
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setDiscountTotal(discountTotal);
        BigDecimal grandTotal = subtotal.subtract(discountTotal).add(taxTotal);
        invoice.setGrandTotal(grandTotal);
        validatePaidAmount(invoice.getPaidAmount(), grandTotal);
        if (invoice.getPaidAmount().signum() > 0 && request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل دفعة");
        }

        SalesInvoice saved = salesInvoiceRepository.save(invoice);
        if (saved.getPaidAmount().signum() > 0) {
            Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
            SalesInvoicePayment payment = salesInvoicePaymentRepository.save(SalesInvoicePayment.builder()
                    .salesInvoice(saved).amount(saved.getPaidAmount()).paymentMethod(paymentMethod).account(account)
                    .note("دفعة أولى عند إصدار الفاتورة").createdBy(actingUser).build());
            if (account != null) {
                accountService.recordTransaction(request.accountId(), TxDirection.IN, saved.getPaidAmount(),
                        LocalDate.now(), AccountSourceType.SALES_PAYMENT, payment.getId(),
                        "دفعة أولى - فاتورة بيع رقم " + saved.getInvoiceNumber(), actingUser);
            }
        }

        return toDto(saved);
    }

    private void validatePaidAmount(BigDecimal paidAmount, BigDecimal grandTotal) {
        if (paidAmount != null && paidAmount.compareTo(grandTotal) > 0) {
            throw ApiException.badRequest("لا يمكن دفع مبلغ أكبر من إجمالي الفاتورة ("
                    + grandTotal.stripTrailingZeros().toPlainString() + ")");
        }
    }

    @Transactional
    public void cancel(Long id, User actingUser) {
        SalesInvoice invoice = getOrThrow(id);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw ApiException.badRequest("الفاتورة ملغاة مسبقاً");
        }
        guardNotClosed(invoice);
        // فقط الكمية غير المرتجعة سابقاً، لتفادي إعادتها للمخزون مرتين (مرة بالإرجاع ومرة بالإلغاء)
        for (SalesInvoiceItem item : invoice.getItems()) {
            BigDecimal notYetReturned = item.getQuantity().subtract(item.getReturnedQuantity());
            if (notYetReturned.signum() <= 0) continue;
            stockService.applyMovement(item.getProduct(), itemWarehouseOrDefault(item, invoice), notYetReturned,
                    MovementType.SALE_RETURN_IN, "SALES_INVOICE_CANCEL", invoice.getId(),
                    "إلغاء فاتورة بيع رقم " + invoice.getInvoiceNumber(), actingUser);
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        salesInvoiceRepository.save(invoice);
    }

    /**
     * تعديل فاتورة بيع مؤكدة: يعكس حركات الأصناف القديمة (إعادتها للمخزون) ثم يطبّق الأصناف الجديدة تماماً كإنشاء
     * فاتورة جديدة. يُمنع التعديل إن كان قد تم إرجاع أي جزء من الفاتورة سابقاً لتفادي تعقيد تتبع الإرجاع.
     */
    @Transactional
    public SalesInvoiceDto update(Long id, SalesInvoiceCreateRequest request, User actingUser) {
        SalesInvoice invoice = getOrThrow(id);
        if (invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw ApiException.badRequest("لا يمكن تعديل فاتورة ملغاة أو مرتجعة");
        }
        boolean hasReturns = invoice.getItems().stream().anyMatch(it -> it.getReturnedQuantity().signum() > 0);
        if (hasReturns) {
            throw ApiException.badRequest("لا يمكن تعديل فاتورة تم إرجاع جزء منها - يمكنك إلغاؤها بدلاً من ذلك");
        }
        guardNotClosed(invoice);

        vanAccessService.enforceSalesmanWarehouse(actingUser, request);
        Warehouse oldWarehouse = invoice.getWarehouse();
        Warehouse newWarehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        Customer customer = request.customerId() != null
                ? customerRepository.findById(request.customerId()).orElseThrow(() -> ApiException.notFound("العميل غير موجود"))
                : null;
        PaymentMethod paymentMethod = parsePaymentMethod(request.paymentMethod());

        // عكس حركات الأصناف القديمة (إعادة الكمية لمخزن كل سطر الأصلي) قبل تطبيق الأصناف الجديدة
        for (SalesInvoiceItem oldItem : invoice.getItems()) {
            stockService.applyMovement(oldItem.getProduct(), itemWarehouseOrDefault(oldItem, invoice), oldItem.getQuantity(),
                    MovementType.SALE_RETURN_IN, "SALES_INVOICE_EDIT", invoice.getId(),
                    "تعديل فاتورة بيع رقم " + invoice.getInvoiceNumber(), actingUser);
        }
        invoice.getItems().clear();

        for (InvoiceItemRequest itemReq : request.items()) {
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, newWarehouse);
            BigDecimal available = stockService.getQuantity(itemReq.productId(), itemWarehouse.getId());
            if (available.compareTo(itemReq.quantity()) < 0) {
                Product p = productRepository.findById(itemReq.productId()).orElse(null);
                String name = p != null ? p.getName() : ("#" + itemReq.productId());
                throw ApiException.badRequest("الكمية المتوفرة من \"" + name + "\" في مخزن \"" + itemWarehouse.getName()
                        + "\" غير كافية (المتوفر: " + available.stripTrailingZeros().toPlainString() + ")");
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO, taxTotal = BigDecimal.ZERO, discountTotal = BigDecimal.ZERO;
        for (InvoiceItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> ApiException.notFound("منتج غير موجود ضمن عناصر الفاتورة"));
            Warehouse itemWarehouse = resolveItemWarehouse(itemReq, newWarehouse);

            BigDecimal tax = itemReq.taxRate() != null ? itemReq.taxRate() : product.getTaxRate();
            BigDecimal discount = itemReq.discount() != null ? itemReq.discount() : BigDecimal.ZERO;
            // كل حد يُقرَّب لثلاث خانات عشرية (مطابقة لدقة عمود قاعدة البيانات) قبل التجميع، بحيث يبقى
            // إجمالي الفاتورة مطابقاً تماماً لمجموع أسطرها المعروضة دائماً، بدل تراكم فروق تقريب طفيفة.
            BigDecimal grossLine = itemReq.quantity().multiply(itemReq.unitPrice()).setScale(3, RoundingMode.HALF_UP);
            BigDecimal lineBase = grossLine.subtract(discount);
            BigDecimal lineTax = lineBase.multiply(tax).divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineBase.add(lineTax);

            SalesInvoiceItem item = SalesInvoiceItem.builder()
                    .salesInvoice(invoice).product(product).warehouse(itemWarehouse)
                    .quantity(itemReq.quantity()).unitPrice(itemReq.unitPrice())
                    .taxRate(tax).discount(discount).lineTotal(lineTotal)
                    .unitCost(product.getPurchasePrice())
                    .build();
            invoice.getItems().add(item);

            subtotal = subtotal.add(grossLine);
            taxTotal = taxTotal.add(lineTax);
            discountTotal = discountTotal.add(discount);

            stockService.applyMovement(product, itemWarehouse, itemReq.quantity().negate(), MovementType.SALE_OUT,
                    "SALES_INVOICE_EDIT", invoice.getId(), "تعديل فاتورة بيع", actingUser);
        }

        invoice.setWarehouse(newWarehouse);
        invoice.setBranch(branch);
        invoice.setCustomer(customer);
        invoice.setPaymentMethod(paymentMethod);
        BigDecimal paidAmount = request.paidAmount() != null ? request.paidAmount() : BigDecimal.ZERO;
        BigDecimal grandTotal = subtotal.subtract(discountTotal).add(taxTotal);
        validatePaidAmount(paidAmount, grandTotal);

        invoice.setPaidAmount(paidAmount);
        invoice.setNotes(request.notes());
        invoice.setDueDate(request.dueDate());
        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setDiscountTotal(discountTotal);
        invoice.setGrandTotal(grandTotal);

        return toDto(salesInvoiceRepository.save(invoice));
    }

    /**
     * إرجاع جزئي أو كلي من فاتورة بيع مؤكدة: يعيد الكمية المرتجعة للمخزون ويحسب قيمة الإرجاع تناسبياً من
     * إجمالي السطر (شاملة الضريبة والخصم). إن اكتمل إرجاع كل الأصناف تتحول حالة الفاتورة إلى "مرتجعة".
     */
    @Transactional
    public SalesReturnDto recordReturn(Long invoiceId, SalesReturnRequest request, User actingUser) {
        SalesInvoice invoice = getOrThrow(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw ApiException.badRequest("لا يمكن الإرجاع إلا من فاتورة مؤكدة");
        }
        guardNotClosed(invoice);

        SalesReturn salesReturn = SalesReturn.builder()
                .salesInvoice(invoice)
                .returnNumber(generateReturnNumber())
                .notes(request.notes())
                .createdBy(actingUser)
                .build();

        BigDecimal totalValue = BigDecimal.ZERO;
        for (SalesReturnItemRequest itemReq : request.items()) {
            SalesInvoiceItem invoiceItem = invoice.getItems().stream()
                    .filter(it -> it.getId().equals(itemReq.invoiceItemId()))
                    .findFirst()
                    .orElseThrow(() -> ApiException.notFound("صنف الفاتورة غير موجود ضمن هذه الفاتورة"));

            BigDecimal remaining = invoiceItem.getQuantity().subtract(invoiceItem.getReturnedQuantity());
            if (itemReq.quantity().compareTo(remaining) > 0) {
                throw ApiException.badRequest("الكمية المطلوب إرجاعها من \"" + invoiceItem.getProduct().getName()
                        + "\" أكبر من المتبقي القابل للإرجاع (" + remaining.stripTrailingZeros().toPlainString() + ")");
            }

            BigDecimal lineValue = invoiceItem.getLineTotal()
                    .multiply(itemReq.quantity())
                    .divide(invoiceItem.getQuantity(), 3, RoundingMode.HALF_UP);

            SalesReturnItem returnItem = SalesReturnItem.builder()
                    .salesReturn(salesReturn).salesInvoiceItem(invoiceItem).product(invoiceItem.getProduct())
                    .quantity(itemReq.quantity()).unitPrice(invoiceItem.getUnitPrice()).lineValue(lineValue)
                    .build();
            salesReturn.getItems().add(returnItem);
            totalValue = totalValue.add(lineValue);

            invoiceItem.setReturnedQuantity(invoiceItem.getReturnedQuantity().add(itemReq.quantity()));

            stockService.applyMovement(invoiceItem.getProduct(), itemWarehouseOrDefault(invoiceItem, invoice), itemReq.quantity(),
                    MovementType.SALE_RETURN_IN, "SALES_RETURN", invoice.getId(),
                    "إرجاع من فاتورة بيع رقم " + invoice.getInvoiceNumber(), actingUser);
        }
        salesReturn.setTotalValue(totalValue);

        boolean fullyReturned = invoice.getItems().stream()
                .allMatch(it -> it.getReturnedQuantity().compareTo(it.getQuantity()) >= 0);
        if (fullyReturned) {
            invoice.setStatus(InvoiceStatus.RETURNED);
        }
        salesInvoiceRepository.save(invoice);

        return toReturnDto(salesReturnRepository.save(salesReturn));
    }

    @Transactional(readOnly = true)
    public List<SalesReturnDto> findReturnsByInvoice(Long invoiceId) {
        return salesReturnRepository.findBySalesInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .stream().map(this::toReturnDto).toList();
    }

    /** يحل مخزن السطر: المخزن المحدد صراحةً لهذا السطر إن وُجد، وإلا مخزن الفاتورة الافتراضي. */
    private Warehouse resolveItemWarehouse(InvoiceItemRequest itemReq, Warehouse defaultWarehouse) {
        if (itemReq.warehouseId() == null || itemReq.warehouseId().equals(defaultWarehouse.getId())) {
            return defaultWarehouse;
        }
        return warehouseRepository.findById(itemReq.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن المحدد للصنف غير موجود"));
    }

    /** للتوافق مع الفواتير القديمة قبل إضافة مخزن السطر (حيث تكون فارغة) - يُستخدم مخزن الفاتورة كبديل. */
    private Warehouse itemWarehouseOrDefault(SalesInvoiceItem item, SalesInvoice invoice) {
        return item.getWarehouse() != null ? item.getWarehouse() : invoice.getWarehouse();
    }

    private PaymentMethod parsePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) return PaymentMethod.CASH;
        try {
            return PaymentMethod.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return PaymentMethod.CASH;
        }
    }

    private String generateReturnNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "SR-" + datePart + "-" + suffix;
    }

    private SalesReturnDto toReturnDto(SalesReturn r) {
        List<SalesReturnItemDto> items = r.getItems().stream().map(it -> new SalesReturnItemDto(
                it.getId(), it.getSalesInvoiceItem().getId(), it.getProduct().getId(), it.getProduct().getName(),
                it.getProduct().getSku(), it.getQuantity(), it.getUnitPrice(), it.getLineValue()
        )).toList();
        return new SalesReturnDto(
                r.getId(), r.getSalesInvoice().getId(), r.getSalesInvoice().getInvoiceNumber(), r.getReturnNumber(),
                r.getTotalValue(), r.getNotes(), r.getCreatedBy() != null ? r.getCreatedBy().getFullName() : null,
                r.getCreatedAt(), items
        );
    }

    private String generateInvoiceNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = salesInvoiceRepository.countByCreatedAtAfterAndStatus(LocalDate.now().atStartOfDay(), InvoiceStatus.CONFIRMED);
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "SI-" + datePart + "-" + String.format("%04d", countToday + 1) + "-" + suffix;
    }

    private SalesInvoice getOrThrow(Long id) {
        return salesInvoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("فاتورة البيع غير موجودة"));
    }

    /** يحسب القيمة الفعلية المتبقية على الفاتورة: الإجمالي ناقص المدفوع وناقص قيمة أي مرتجعات (لا تُحتسب كدين). */
    private BigDecimal netDueAmount(SalesInvoice inv) {
        BigDecimal raw = rawNetAmount(inv);
        return raw.signum() < 0 ? BigDecimal.ZERO : raw;
    }

    /**
     * لو العميل دفع أكثر من (الإجمالي ناقص المرتجعات) - مثلاً دفع الفاتورة كاملة ثم أرجع بضاعة منها -
     * يرجع المبلغ اللي يستحق المحل إرجاعه له نقداً. صفر يعني لا يوجد مبلغ مستحق إرجاعه.
     */
    private BigDecimal netCreditOwed(SalesInvoice inv) {
        BigDecimal raw = rawNetAmount(inv);
        return raw.signum() < 0 ? raw.negate() : BigDecimal.ZERO;
    }

    private BigDecimal rawNetAmount(SalesInvoice inv) {
        // فاتورة ملغاة: كل البضاعة رجعت للمخزون بالكامل (إلغاء = إرجاع شامل ضمنياً)، فأي مبلغ سبق
        // تحصيله من العميل (paidAmount يعكس أي استرجاع سابق تلقائياً لأنه يُخصم عند كل عملية استرجاع)
        // يستحق إرجاعه له بالكامل، بصرف النظر عن أي مرتجع جزئي كان قد سُجِّل قبل الإلغاء.
        if (inv.getStatus() == InvoiceStatus.CANCELLED) {
            return inv.getPaidAmount().negate();
        }
        BigDecimal returned = salesReturnRepository.sumReturnedValueByInvoiceId(inv.getId());
        return inv.getGrandTotal().subtract(inv.getPaidAmount()).subtract(returned);
    }

    private SalesInvoiceDto toDto(SalesInvoice inv) {
        List<InvoiceItemDto> items = inv.getItems().stream().map(it -> {
            Warehouse w = itemWarehouseOrDefault(it, inv);
            return new InvoiceItemDto(
                    it.getId(), it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                    it.getProduct().getUnit().getName(), w.getId(), w.getName(),
                    it.getQuantity(), it.getUnitPrice(), it.getTaxRate(),
                    it.getDiscount(), it.getLineTotal(), it.getReturnedQuantity()
            );
        }).toList();

        return new SalesInvoiceDto(
                inv.getId(), inv.getInvoiceNumber(),
                inv.getCustomer() != null ? inv.getCustomer().getId() : null,
                inv.getCustomer() != null ? inv.getCustomer().getName() : null,
                inv.getCustomer() != null ? inv.getCustomer().getTaxNumber() : null,
                inv.getWarehouse().getId(), inv.getWarehouse().getName(),
                inv.getBranch().getId(), inv.getBranch().getName(),
                inv.getStatus().name(), inv.getSubtotal(), inv.getTaxTotal(), inv.getDiscountTotal(),
                inv.getGrandTotal(), inv.getPaidAmount(), netDueAmount(inv), netCreditOwed(inv),
                inv.getPaymentMethod().name(), inv.getNotes(), inv.getDueDate(),
                inv.getCreatedBy() != null ? inv.getCreatedBy().getFullName() : null,
                inv.getCreatedAt(), items
        );
    }

    /**
     * إضافة دفعة جديدة على فاتورة (تقسيط): لا يمكن أن يتجاوز مجموع الدفعات إجمالي الفاتورة.
     */
    @Transactional
    public SalesInvoiceDto addPayment(Long invoiceId, SalesPaymentRequest request, User actingUser) {
        SalesInvoice invoice = getOrThrow(invoiceId);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw ApiException.badRequest("لا يمكن إضافة دفعة لفاتورة ملغاة");
        }
        BigDecimal remaining = netDueAmount(invoice);
        if (request.amount().compareTo(remaining) > 0) {
            throw ApiException.badRequest("مبلغ الدفعة أكبر من المتبقي على الفاتورة (المتبقي: "
                    + remaining.stripTrailingZeros().toPlainString() + ")");
        }
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل دفعة");
        }

        PaymentMethod method = parsePaymentMethod(request.paymentMethod());
        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
        SalesInvoicePayment payment = SalesInvoicePayment.builder()
                .salesInvoice(invoice).amount(request.amount()).paymentMethod(method).account(account)
                .note(request.note()).createdBy(actingUser).build();
        payment = salesInvoicePaymentRepository.save(payment);

        if (account != null) {
            accountService.recordTransaction(request.accountId(), TxDirection.IN, request.amount(),
                    LocalDate.now(), AccountSourceType.SALES_PAYMENT, payment.getId(),
                    "دفعة فاتورة بيع رقم " + invoice.getInvoiceNumber(), actingUser);
        }

        invoice.setPaidAmount(invoice.getPaidAmount().add(request.amount()));
        return toDto(salesInvoiceRepository.save(invoice));
    }

    /**
     * تسجيل استرجاع مبلغ نقداً للعميل عندما يكون قد دفع كاملاً ثم أرجع بضاعة أو أُلغيت الفاتورة
     * (creditOwed > 0 بكلا الحالتين - انظر rawNetAmount). يُسجَّل كدفعة سالبة بسجل الدفعات (تظهر
     * بسجل التاريخ كـ"استرجاع") وتُخصم من paidAmount، فتصفر "المستحق للعميل" تدريجياً. لا حاجة لفحص
     * الحالة صراحة هنا: فحص المبلغ أدناه (لا يتجاوز المستحق الفعلي) يمنع أي استرجاع غير مستحق أصلاً
     * أياً كانت حالة الفاتورة، ويسمح بمعالجة المبلغ العالق بعد إلغاء فاتورة مدفوعة مسبقاً.
     */
    @Transactional
    public SalesInvoiceDto recordRefund(Long invoiceId, SalesRefundRequest request, User actingUser) {
        SalesInvoice invoice = getOrThrow(invoiceId);
        BigDecimal owed = netCreditOwed(invoice);
        if (request.amount().compareTo(owed) > 0) {
            throw ApiException.badRequest("المبلغ أكبر من المستحق إرجاعه للعميل (المستحق: "
                    + owed.stripTrailingZeros().toPlainString() + ")");
        }
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل إرجاع");
        }

        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
        SalesInvoicePayment refund = SalesInvoicePayment.builder()
                .salesInvoice(invoice).amount(request.amount().negate()).paymentMethod(PaymentMethod.CASH).account(account)
                .note("استرجاع نقدي للعميل" + (request.note() != null && !request.note().isBlank() ? ": " + request.note() : ""))
                .createdBy(actingUser).build();
        refund = salesInvoicePaymentRepository.save(refund);

        if (account != null) {
            accountService.recordTransaction(request.accountId(), TxDirection.OUT, request.amount(),
                    LocalDate.now(), AccountSourceType.SALES_PAYMENT, refund.getId(),
                    "استرجاع نقدي - فاتورة بيع رقم " + invoice.getInvoiceNumber(), actingUser);
        }

        invoice.setPaidAmount(invoice.getPaidAmount().subtract(request.amount()));
        return toDto(salesInvoiceRepository.save(invoice));
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> getPayments(Long invoiceId) {
        return salesInvoicePaymentRepository.findBySalesInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .stream().map(this::toPaymentDto).toList();
    }

    /**
     * فواتير البيع غير المسددة - يُستبعد منها ما أصبح صافي متبقيه صفراً بعد خصم المرتجعات (وإن كان
     * لا يزال paidAmount أقل من grandTotal بالحساب الخام)، حتى لا تظهر فاتورة مسددة فعلياً بهذه القائمة.
     */
    @Transactional(readOnly = true)
    public Page<SalesInvoiceDto> outstanding(Pageable pageable) {
        // يجب حساب الصافي بعد خصم المرتجعات على كامل القائمة أولاً قبل التقسيم لصفحات، وإلا فإن
        // ترقيم الصفحات على نتيجة الاستعلام الخام (قبل الفلترة) يعطي "إجمالي" خاطئاً (فقط عناصر
        // الصفحة الحالية الناجية من الفلتر) بدلاً من العدد الحقيقي لكل الفواتير المستحقة.
        List<SalesInvoiceDto> filtered = salesInvoiceRepository.findAllOutstanding().stream()
                .map(this::toDto)
                .filter(dto -> dto.dueAmount().signum() > 0)
                .toList();
        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    /**
     * إجمالي المستحق لكل عميل، بعد خصم قيمة أي مرتجعات من الإجمالي (فلا تُحتسب البضاعة المرتجعة كدين).
     * Per-customer outstanding balance, net of any returned merchandise value (returns are not counted as debt).
     */
    @Transactional(readOnly = true)
    public List<PartyBalanceDto> balancesByCustomer() {
        List<SalesInvoice> outstanding = salesInvoiceRepository.findAllOutstanding();
        if (outstanding.isEmpty()) return List.of();

        List<Long> invoiceIds = outstanding.stream().map(SalesInvoice::getId).toList();
        Map<Long, BigDecimal> returnedByInvoice = new HashMap<>();
        for (Object[] row : salesReturnRepository.sumReturnedValueByInvoiceIds(invoiceIds)) {
            returnedByInvoice.put((Long) row[0], (BigDecimal) row[1]);
        }

        Map<Long, PartyBalanceAgg> byCustomer = new java.util.LinkedHashMap<>();
        for (SalesInvoice inv : outstanding) {
            BigDecimal returned = returnedByInvoice.getOrDefault(inv.getId(), BigDecimal.ZERO);
            BigDecimal netGrandTotal = inv.getGrandTotal().subtract(returned);
            BigDecimal due = netGrandTotal.subtract(inv.getPaidAmount());
            if (due.signum() <= 0) continue;

            // فاتورة بدون عميل محدد (بيع مباشر بدون تحديد عميل، أو عميل محذوف لاحقاً) قد يكون لها
            // مبلغ مستحق أيضاً - تُجمَّع تحت مفتاح ثابت (0L) بدلاً من إسقاطها من الإجمالي بالخطأ.
            Long customerId = inv.getCustomer() != null ? inv.getCustomer().getId() : 0L;
            String customerName = inv.getCustomer() != null ? inv.getCustomer().getName() : "بدون عميل محدد";
            PartyBalanceAgg agg = byCustomer.computeIfAbsent(customerId, id -> new PartyBalanceAgg(customerName));
            agg.invoiceCount++;
            agg.totalGrandTotal = agg.totalGrandTotal.add(netGrandTotal);
            agg.totalPaid = agg.totalPaid.add(inv.getPaidAmount());
        }

        return byCustomer.entrySet().stream()
                .map(e -> new PartyBalanceDto(e.getKey(), e.getValue().name, e.getValue().invoiceCount,
                        e.getValue().totalGrandTotal, e.getValue().totalPaid,
                        e.getValue().totalGrandTotal.subtract(e.getValue().totalPaid)))
                .sorted(Comparator.comparing(PartyBalanceDto::partyName))
                .toList();
    }

    private static class PartyBalanceAgg {
        final String name;
        long invoiceCount = 0;
        BigDecimal totalGrandTotal = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;

        PartyBalanceAgg(String name) {
            this.name = name;
        }
    }

    private PaymentDto toPaymentDto(SalesInvoicePayment p) {
        return new PaymentDto(
                p.getId(), p.getAmount(), p.getPaymentMethod().name(), p.getNote(),
                p.getAccount() != null ? p.getAccount().getName() : null,
                p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : null, p.getCreatedAt()
        );
    }
}
