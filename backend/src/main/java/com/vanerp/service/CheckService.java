package com.vanerp.service;

import com.vanerp.dto.CheckDto;
import com.vanerp.dto.CheckRequest;
import com.vanerp.dto.CheckStatusUpdateRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.AccountSourceType;
import com.vanerp.model.Check;
import com.vanerp.model.CheckDirection;
import com.vanerp.model.CheckStatus;
import com.vanerp.model.Customer;
import com.vanerp.model.PurchaseInvoice;
import com.vanerp.model.PaymentMethod;
import com.vanerp.model.SalesInvoice;
import com.vanerp.model.SalesInvoicePayment;
import com.vanerp.model.Van;
import com.vanerp.model.Supplier;
import com.vanerp.model.TxDirection;
import com.vanerp.model.User;
import com.vanerp.repository.CheckRepository;
import com.vanerp.repository.CustomerRepository;
import com.vanerp.repository.PurchaseInvoiceRepository;
import com.vanerp.repository.SalesInvoiceRepository;
import com.vanerp.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckService {

    private final CheckRepository checkRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final AccountService accountService;
    private final com.vanerp.repository.SalesInvoicePaymentRepository salesInvoicePaymentRepository;

    @Transactional(readOnly = true)
    public Page<CheckDto> search(CheckStatus status, Pageable pageable) {
        return checkRepository.search(status != null ? status.name() : null, pageable).map(this::toDto);
    }

    @Transactional
    public CheckDto create(CheckRequest request, User actingUser) {
        Customer customer = request.customerId() != null
                ? customerRepository.findById(request.customerId()).orElseThrow(() -> ApiException.notFound("العميل غير موجود"))
                : null;
        Supplier supplier = request.supplierId() != null
                ? supplierRepository.findById(request.supplierId()).orElseThrow(() -> ApiException.notFound("المورد غير موجود"))
                : null;
        SalesInvoice salesInvoice = request.relatedSalesInvoiceId() != null
                ? salesInvoiceRepository.findById(request.relatedSalesInvoiceId()).orElseThrow(() -> ApiException.notFound("فاتورة البيع غير موجودة"))
                : null;
        PurchaseInvoice purchaseInvoice = request.relatedPurchaseInvoiceId() != null
                ? purchaseInvoiceRepository.findById(request.relatedPurchaseInvoiceId()).orElseThrow(() -> ApiException.notFound("فاتورة الشراء غير موجودة"))
                : null;

        Check check = Check.builder()
                .direction(request.direction()).customer(customer).supplier(supplier).partyName(request.partyName())
                .amount(request.amount()).checkNumber(request.checkNumber()).bankName(request.bankName())
                .dueDate(request.dueDate()).status(CheckStatus.PENDING)
                .relatedSalesInvoice(salesInvoice).relatedPurchaseInvoice(purchaseInvoice)
                .notes(request.notes()).createdBy(actingUser)
                .build();
        return toDto(checkRepository.save(check));
    }

    /**
     * تغيير حالة شيك: PENDING فقط هي نقطة البداية المسموحة. CLEARED تتطلب accountId وتنشئ حركة حساب
     * (IN للشيك المستلم يعني دخول كاش، OUT للشيك المُصدر يعني خروج كاش). BOUNCED/CANCELLED بدون حركة حساب.
     */
    @Transactional
    public CheckDto updateStatus(Long id, CheckStatusUpdateRequest request, User actingUser) {
        Check check = getOrThrow(id);
        if (check.getStatus() != CheckStatus.PENDING) {
            throw ApiException.badRequest("لا يمكن تغيير حالة شيك تمت معالجته مسبقاً (الحالة الحالية: " + check.getStatus() + ")");
        }

        if (request.status() == CheckStatus.CLEARED) {
            if (request.accountId() == null) {
                throw ApiException.badRequest("لازم تحدد الحساب اللي انصرف/استُلم فيه الشيك عند التصفية");
            }
            TxDirection direction = check.getDirection() == CheckDirection.RECEIVED ? TxDirection.IN : TxDirection.OUT;
            String partyLabel = check.getCustomer() != null ? check.getCustomer().getName()
                    : check.getSupplier() != null ? check.getSupplier().getName() : check.getPartyName();
            accountService.recordTransaction(request.accountId(), direction, check.getAmount(),
                    java.time.LocalDate.now(), AccountSourceType.CHECK_CLEARED, check.getId(),
                    "تصفية شيك رقم " + (check.getCheckNumber() != null ? check.getCheckNumber() : "-")
                            + (partyLabel != null ? " - " + partyLabel : ""),
                    actingUser);
            check.setAccount(accountService.getAccountRef(request.accountId()));
        } else if (request.status() != CheckStatus.BOUNCED && request.status() != CheckStatus.CANCELLED) {
            throw ApiException.badRequest("انتقال حالة غير مسموح");
        } else if (check.getRelatedSalesPayment() != null) {
            // شيك راجع/ملغى سُدّدت به فاتورة: تعود قيمته ديناً على الفاتورة (دفعة سالبة موثّقة)
            SalesInvoice invoice = check.getRelatedSalesPayment().getSalesInvoice();
            invoice.setPaidAmount(invoice.getPaidAmount().subtract(check.getAmount()));
            salesInvoiceRepository.save(invoice);
            salesInvoicePaymentRepository.save(SalesInvoicePayment.builder()
                    .salesInvoice(invoice).amount(check.getAmount().negate()).paymentMethod(PaymentMethod.CHECK)
                    .note((request.status() == CheckStatus.BOUNCED ? "شيك راجع" : "شيك ملغى") + " رقم "
                            + (check.getCheckNumber() != null ? check.getCheckNumber() : "-") + " - عادت قيمته ديناً على الفاتورة")
                    .createdBy(actingUser).build());
        }

        check.setStatus(request.status());
        return toDto(checkRepository.save(check));
    }

    @Transactional
    public void delete(Long id) {
        Check check = getOrThrow(id);
        if (check.getStatus() == CheckStatus.CLEARED) {
            throw ApiException.badRequest("لا يمكن حذف شيك تمت تصفيته - الغِ التصفية غير ممكن، سجّل حركة يدوية معاكسة إذا لزم");
        }
        if (check.getRelatedSalesPayment() != null && check.getStatus() == CheckStatus.PENDING) {
            throw ApiException.badRequest("هذا الشيك مسجّل كدفعة على فاتورة بيع - غيّر حالته إلى ملغى أو راجع بدلاً من حذفه");
        }
        checkRepository.delete(check);
    }

    /** شيك مستلم من عميل كدفعة على فاتورة بيع (من البيع أو التحصيل) - بانتظار التصفية. */
    @Transactional
    public Check createFromSalePayment(SalesInvoice invoice, SalesInvoicePayment payment, com.vanerp.dto.CheckInfo info,
                                       Van van, User actingUser) {
        String notes = "دفعة فاتورة بيع رقم " + invoice.getInvoiceNumber()
                + (info.drawerName() != null && !info.drawerName().isBlank() ? " - الساحب: " + info.drawerName() : "")
                + (van != null ? " - استلمه سائق " + van.getName() : "");
        return checkRepository.save(Check.builder()
                .direction(CheckDirection.RECEIVED).customer(invoice.getCustomer())
                .partyName(info.drawerName() != null && !info.drawerName().isBlank() ? info.drawerName()
                        : invoice.getCustomer() != null ? invoice.getCustomer().getName() : null)
                .amount(payment.getAmount()).checkNumber(info.checkNumber()).bankName(info.bankName())
                .dueDate(info.dueDate()).status(CheckStatus.PENDING)
                .relatedSalesInvoice(invoice).relatedSalesPayment(payment).van(van).image(info.image())
                .notes(notes).createdBy(actingUser).build());
    }

    @Transactional(readOnly = true)
    public String image(Long id) {
        return getOrThrow(id).getImage();
    }

    private Check getOrThrow(Long id) {
        return checkRepository.findById(id).orElseThrow(() -> ApiException.notFound("الشيك غير موجود"));
    }

    private CheckDto toDto(Check c) {
        return new CheckDto(
                c.getId(), c.getDirection(),
                c.getCustomer() != null ? c.getCustomer().getId() : null,
                c.getCustomer() != null ? c.getCustomer().getName() : null,
                c.getSupplier() != null ? c.getSupplier().getId() : null,
                c.getSupplier() != null ? c.getSupplier().getName() : null,
                c.getPartyName(), c.getAmount(), c.getCheckNumber(), c.getBankName(), c.getDueDate(), c.getStatus(),
                c.getAccount() != null ? c.getAccount().getId() : null,
                c.getAccount() != null ? c.getAccount().getName() : null,
                c.getRelatedSalesInvoice() != null ? c.getRelatedSalesInvoice().getId() : null,
                c.getRelatedPurchaseInvoice() != null ? c.getRelatedPurchaseInvoice().getId() : null,
                c.getNotes(), c.getCreatedBy() != null ? c.getCreatedBy().getFullName() : null, c.getCreatedAt()
        ,
                c.getRelatedSalesInvoice() != null ? c.getRelatedSalesInvoice().getInvoiceNumber() : null,
                c.getVan() != null ? c.getVan().getName() : null,
                c.getImage() != null && !c.getImage().isBlank());
    }
}
