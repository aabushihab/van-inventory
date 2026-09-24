package com.ceramicerp.service;

import com.ceramicerp.dto.NotificationDto;
import com.ceramicerp.model.Notification;
import com.ceramicerp.model.NotificationType;
import com.ceramicerp.model.Product;
import com.ceramicerp.model.PurchaseInvoice;
import com.ceramicerp.model.SalesInvoice;
import com.ceramicerp.model.Warehouse;
import com.ceramicerp.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public Page<NotificationDto> findAll(Pageable pageable) {
        return notificationRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    public long unreadCount() {
        return notificationRepository.countByReadFalse();
    }

    @Transactional
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead() {
        notificationRepository.findAll().forEach(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    /**
     * ينشئ تنبيه نقصان مخزون إن لم يكن هناك تنبيه غير مقروء لنفس المنتج/المخزن مسبقاً
     * (لتجنب التكرار وإغراق قائمة التنبيهات).
     */
    @Transactional
    public void raiseLowStockAlertIfNeeded(Product product, Warehouse warehouse, java.math.BigDecimal currentQty) {
        boolean alreadyAlerted = notificationRepository
                .existsByRelatedProductIdAndRelatedWarehouseIdAndReadFalse(product.getId(), warehouse.getId());
        if (alreadyAlerted) return;

        String title = "تنبيه نقصان مخزون: " + product.getName();
        String message = String.format(
                "الكمية المتوفرة من \"%s\" في مخزن \"%s\" هي %s وهي أقل من أو تساوي الحد الأدنى المحدد (%s).",
                product.getName(), warehouse.getName(), currentQty.stripTrailingZeros().toPlainString(),
                product.getMinStockThreshold().stripTrailingZeros().toPlainString());

        Notification notification = Notification.builder()
                .type(NotificationType.LOW_STOCK)
                .title(title)
                .message(message)
                .relatedProduct(product)
                .relatedWarehouse(warehouse)
                .read(false)
                .build();

        notificationRepository.save(notification);
    }

    /**
     * ينشئ تنبيه تأخر سداد لفاتورة بيع إن لم يكن هناك تنبيه غير مقروء لنفس الفاتورة مسبقاً.
     */
    @Transactional
    public void raiseOverdueSalesInvoiceAlertIfNeeded(SalesInvoice invoice, long daysOverdue, BigDecimal dueAmount) {
        if (notificationRepository.existsByRelatedSalesInvoiceIdAndReadFalse(invoice.getId())) return;

        String title = "فاتورة بيع متأخرة السداد: " + invoice.getInvoiceNumber();
        String message = String.format(
                "فاتورة \"%s\"%s تجاوزت تاريخ الاستحقاق بـ %d يوم، والمبلغ المتبقي %s.",
                invoice.getInvoiceNumber(),
                invoice.getCustomer() != null ? " للعميل " + invoice.getCustomer().getName() : "",
                daysOverdue, dueAmount.stripTrailingZeros().toPlainString());

        Notification notification = Notification.builder()
                .type(NotificationType.OVERDUE_SALES_INVOICE)
                .title(title)
                .message(message)
                .relatedSalesInvoice(invoice)
                .read(false)
                .build();

        notificationRepository.save(notification);
    }

    /**
     * ينشئ تنبيه تأخر سداد لفاتورة شراء إن لم يكن هناك تنبيه غير مقروء لنفس الفاتورة مسبقاً.
     */
    @Transactional
    public void raiseOverduePurchaseInvoiceAlertIfNeeded(PurchaseInvoice invoice, long daysOverdue, BigDecimal dueAmount) {
        if (notificationRepository.existsByRelatedPurchaseInvoiceIdAndReadFalse(invoice.getId())) return;

        String title = "فاتورة شراء متأخرة السداد: " + invoice.getInvoiceNumber();
        String message = String.format(
                "فاتورة \"%s\"%s تجاوزت تاريخ الاستحقاق بـ %d يوم، والمبلغ المتبقي %s.",
                invoice.getInvoiceNumber(),
                invoice.getSupplier() != null ? " للمورد " + invoice.getSupplier().getName() : "",
                daysOverdue, dueAmount.stripTrailingZeros().toPlainString());

        Notification notification = Notification.builder()
                .type(NotificationType.OVERDUE_PURCHASE_INVOICE)
                .title(title)
                .message(message)
                .relatedPurchaseInvoice(invoice)
                .read(false)
                .build();

        notificationRepository.save(notification);
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(
                n.getId(), n.getType().name(), n.getTitle(), n.getMessage(),
                n.getRelatedProduct() != null ? n.getRelatedProduct().getId() : null,
                n.getRelatedProduct() != null ? n.getRelatedProduct().getName() : null,
                n.getRelatedWarehouse() != null ? n.getRelatedWarehouse().getId() : null,
                n.getRelatedWarehouse() != null ? n.getRelatedWarehouse().getName() : null,
                n.getRelatedSalesInvoice() != null ? n.getRelatedSalesInvoice().getId() : null,
                n.getRelatedSalesInvoice() != null ? n.getRelatedSalesInvoice().getInvoiceNumber() : null,
                n.getRelatedPurchaseInvoice() != null ? n.getRelatedPurchaseInvoice().getId() : null,
                n.getRelatedPurchaseInvoice() != null ? n.getRelatedPurchaseInvoice().getInvoiceNumber() : null,
                n.isRead(), n.getCreatedAt()
        );
    }
}
