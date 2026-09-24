package com.vanerp.service;

import com.vanerp.dto.AgingBucketDto;
import com.vanerp.dto.BalanceSheetDto;
import com.vanerp.dto.FinancialPeriodDto;
import com.vanerp.dto.InventoryValueDto;
import com.vanerp.dto.StockMovementSummaryDto;
import com.vanerp.dto.TaxPayableSummaryDto;
import com.vanerp.dto.TopPartyDto;
import com.vanerp.dto.TopProductDto;
import com.vanerp.model.PurchaseInvoice;
import com.vanerp.model.PurchaseReturn;
import com.vanerp.model.PurchaseReturnItem;
import com.vanerp.model.SalesInvoice;
import com.vanerp.model.SalesInvoiceItem;
import com.vanerp.model.SalesReturn;
import com.vanerp.model.SalesReturnItem;
import com.vanerp.dto.CashFlowStatementDto;
import com.vanerp.model.AccountSourceType;
import com.vanerp.model.AccountTransaction;
import com.vanerp.model.Expense;
import com.vanerp.model.StockItem;
import com.vanerp.model.StockMovement;
import com.vanerp.model.TxDirection;
import com.vanerp.repository.AccountTransactionRepository;
import com.vanerp.repository.ExpenseRepository;
import com.vanerp.repository.PurchaseInvoiceRepository;
import com.vanerp.repository.PurchaseReturnRepository;
import com.vanerp.repository.SalesInvoiceRepository;
import com.vanerp.repository.SalesReturnRepository;
import com.vanerp.repository.StockItemRepository;
import com.vanerp.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * تقارير مالية ومستودعية: الأرباح اليومية/الشهرية وقيمة المخزون الحالي.
 * Financial & warehouse reports: daily/monthly profit and current inventory value.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesReturnRepository salesReturnRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final PurchaseReturnRepository purchaseReturnRepository;
    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ExpenseRepository expenseRepository;
    private final AccountService accountService;
    private final AccountTransactionRepository accountTransactionRepository;
    private final FixedAssetService fixedAssetService;

    @Transactional(readOnly = true)
    public List<FinancialPeriodDto> financialReport(LocalDate from, LocalDate to, String groupBy) {
        DateTimeFormatter formatter = "month".equalsIgnoreCase(groupBy) ? MONTH_FORMAT : DAY_FORMAT;
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        Map<String, Accumulator> byPeriod = new LinkedHashMap<>();

        List<SalesInvoice> sales = salesInvoiceRepository.findConfirmedWithItemsBetween(start, end);
        for (SalesInvoice invoice : sales) {
            String period = invoice.getCreatedAt().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            acc.salesCount++;
            acc.salesTotal = acc.salesTotal.add(invoice.getSubtotal());
            acc.discountTotal = acc.discountTotal.add(invoice.getDiscountTotal());
            for (SalesInvoiceItem item : invoice.getItems()) {
                BigDecimal cost = item.getUnitCost().multiply(item.getQuantity());
                acc.costOfGoodsSold = acc.costOfGoodsSold.add(cost);
            }
        }

        List<PurchaseInvoice> purchases = purchaseInvoiceRepository.findActiveWithSupplierBetween(start, end);
        for (PurchaseInvoice invoice : purchases) {
            String period = invoice.getCreatedAt().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            acc.purchasesTotal = acc.purchasesTotal.add(invoice.getGrandTotal());
        }

        // مرتجعات المبيعات تُخصم من مبيعات وتكلفة يوم/شهر الفاتورة الأصلية (وليس يوم الإرجاع نفسه)، حتى لا
        // يظهر يوم هادئ بخسارة وهمية بسبب إرجاع بضاعة بيعت بفترة سابقة.
        List<SalesReturn> returns = salesReturnRepository.findByInvoiceCreatedAtBetween(start, end);
        for (SalesReturn salesReturn : returns) {
            String period = salesReturn.getSalesInvoice().getCreatedAt().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            for (SalesReturnItem item : salesReturn.getItems()) {
                // acc.salesTotal تراكمية بالسعر الأساسي قبل الضريبة (grossLine = qty * unitPrice الأصلي)،
                // لذا يجب خصم المرتجع بنفس الأساس - سعر وحدة الفاتورة الأصلية، وليس item.getUnitPrice()
                // الخاص بسطر الإرجاع (وهو سعر شامل الضريبة/الخصم مُحسَّب لغرض credit العميل فقط) وإلا
                // يُخصم جزء الضريبة المتضمّن في سعر الإرجاع من "المبيعات" فيظهر الربح أعلى من الحقيقة.
                BigDecimal subtotalPortion = item.getSalesInvoiceItem().getUnitPrice().multiply(item.getQuantity());
                BigDecimal costPortion = item.getSalesInvoiceItem().getUnitCost().multiply(item.getQuantity());
                acc.salesTotal = acc.salesTotal.subtract(subtotalPortion);
                acc.costOfGoodsSold = acc.costOfGoodsSold.subtract(costPortion);
            }
        }

        // مرتجعات الشراء تُخصم من إجمالي المشتريات ليوم/شهر فاتورة الشراء الأصلية (نفس منهجية مرتجعات المبيعات)
        List<PurchaseReturn> purchaseReturns = purchaseReturnRepository.findByInvoiceCreatedAtBetween(start, end);
        for (PurchaseReturn purchaseReturn : purchaseReturns) {
            String period = purchaseReturn.getPurchaseInvoice().getCreatedAt().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            for (PurchaseReturnItem item : purchaseReturn.getItems()) {
                acc.purchasesTotal = acc.purchasesTotal.subtract(item.getLineValue());
            }
        }

        // خسارة التوالف غير المعوَّضة تُخصم من ربح يوم/شهر التلف نفسه (لا يوجد "فاتورة أصلية" هنا كالمرتجعات
        // لتُنسب لها، فالحدث نفسه هو الأصل). تُحسب حسب حالة التعويض الحالية (compensatedQuantity حية وليست
        // مجمّدة وقت التلف)، بنفس صيغة StockService.toDamagedDto تماماً.
        List<StockMovement> damages = stockMovementRepository.findDamagedBetween(start, end);
        for (StockMovement damage : damages) {
            String period = damage.getCreatedAt().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            BigDecimal remaining = damage.getQuantity().abs().subtract(damage.getCompensatedQuantity());
            if (remaining.signum() <= 0) continue;
            BigDecimal lostValue = damage.getProduct().getPurchasePrice().multiply(remaining);
            acc.damagedLoss = acc.damagedLoss.add(lostValue);
        }

        // مصاريف المحل التشغيلية (كهرباء، إيجار...) تُخصم من ربح يوم/شهر تاريخ المصروف نفسه.
        List<Expense> expenses = expenseRepository.findByExpenseDateBetween(from, to);
        for (Expense expense : expenses) {
            String period = expense.getExpenseDate().format(formatter);
            Accumulator acc = byPeriod.computeIfAbsent(period, p -> new Accumulator());
            acc.expensesTotal = acc.expensesTotal.add(expense.getAmount());
        }

        List<FinancialPeriodDto> result = new ArrayList<>();
        for (Map.Entry<String, Accumulator> entry : byPeriod.entrySet()) {
            Accumulator acc = entry.getValue();
            BigDecimal netSales = acc.salesTotal.subtract(acc.discountTotal);
            BigDecimal grossProfit = netSales.subtract(acc.costOfGoodsSold)
                    .subtract(acc.damagedLoss).subtract(acc.expensesTotal);
            result.add(new FinancialPeriodDto(
                    entry.getKey(), acc.salesCount, acc.salesTotal, acc.discountTotal,
                    acc.costOfGoodsSold, acc.damagedLoss, acc.expensesTotal, grossProfit, acc.purchasesTotal
            ));
        }
        result.sort((a, b) -> a.period().compareTo(b.period()));
        return result;
    }

    /**
     * ملخص الضريبة المستحقة: ضريبة محصّلة من مبيعات مؤكدة (مستحقة الدفع للجهة الضريبية) مقابل ضريبة
     * مدفوعة على مشتريات (قابلة للخصم) خلال الفترة - على أساس تاريخ الفاتورة (accrual)، بنفس منهجية
     * financialReport، وليس أساس نقدي. لا تُخصم ضريبة المرتجعات هنا (تبسيط مقصود لملخص تقريبي سريع).
     */
    @Transactional(readOnly = true)
    public TaxPayableSummaryDto taxPayableSummary(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        BigDecimal taxCollected = salesInvoiceRepository.findConfirmedWithItemsBetween(start, end).stream()
                .map(SalesInvoice::getTaxTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxPaid = purchaseInvoiceRepository.findActiveWithSupplierBetween(start, end).stream()
                .map(PurchaseInvoice::getTaxTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new TaxPayableSummaryDto(taxCollected, taxPaid, taxCollected.subtract(taxPaid));
    }

    /**
     * الميزانية العمومية اللحظية (الآن، وليست بتاريخ ماضٍ). حقوق الملكية رقم موازن = الأصول − الالتزامات
     * (لا يوجد دفتر أستاذ مزدوج القيد كامل بالنظام، فهذا التبسيط المتّسق مع باقي التقارير).
     */
    @Transactional(readOnly = true)
    public BalanceSheetDto balanceSheet() {
        BigDecimal cashAndBank = accountService.balances().stream()
                .map(b -> b.balance()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal inventoryValue = inventoryValue(null).stream()
                .map(InventoryValueDto::value).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal accountsReceivable = receivablesAging().stream()
                .map(AgingBucketDto::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal fixedAssetsValue = fixedAssetService.findAll().stream()
                .filter(a -> a.status() == com.vanerp.model.FixedAssetStatus.ACTIVE)
                .map(a -> a.netBookValue()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal accountsPayable = payablesAging().stream()
                .map(AgingBucketDto::total).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAssets = cashAndBank.add(inventoryValue).add(accountsReceivable).add(fixedAssetsValue);
        BigDecimal totalLiabilities = accountsPayable;
        BigDecimal equity = totalAssets.subtract(totalLiabilities);

        return new BalanceSheetDto(cashAndBank, inventoryValue, accountsReceivable, fixedAssetsValue, totalAssets,
                accountsPayable, totalLiabilities, equity);
    }

    private static final java.util.Set<AccountSourceType> OPERATING_SOURCES = java.util.Set.of(
            AccountSourceType.SALES_PAYMENT, AccountSourceType.PURCHASE_PAYMENT, AccountSourceType.EXPENSE,
            AccountSourceType.CHECK_CLEARED, AccountSourceType.MANUAL);
    private static final java.util.Set<AccountSourceType> INVESTING_SOURCES = java.util.Set.of(
            AccountSourceType.FIXED_ASSET_PURCHASE, AccountSourceType.FIXED_ASSET_SALE);
    private static final java.util.Set<AccountSourceType> FINANCING_SOURCES = java.util.Set.of(
            AccountSourceType.CAPITAL_IN, AccountSourceType.CAPITAL_OUT);

    /**
     * قائمة التدفقات النقدية: تصنّف كل حركة حساب بالفترة لتشغيلي/استثماري/تمويلي حسب نوع مصدرها،
     * وتستبعد التحويل بين حسابات الشركة (TRANSFER) لأنه لا يمثل تدفقاً حقيقياً من/إلى خارجها
     * (يصفّر نفسه رياضياً عند جمع كل الحسابات معاً).
     */
    @Transactional(readOnly = true)
    public CashFlowStatementDto cashFlowStatement(LocalDate from, LocalDate to) {
        List<AccountTransaction> inRange = accountTransactionRepository.findByTransactionDateBetween(from, to);
        BigDecimal operatingNet = netForSources(inRange, OPERATING_SOURCES);
        BigDecimal investingNet = netForSources(inRange, INVESTING_SOURCES);
        BigDecimal financingNet = netForSources(inRange, FINANCING_SOURCES);
        BigDecimal netChange = operatingNet.add(investingNet).add(financingNet);

        // الرصيد الافتتاحي = مجموع الأرصدة الافتتاحية لكل الحسابات + صافي كل الحركات (شاملة التحويلات
        // المحايدة إجمالياً) قبل بداية الفترة تماماً - نفس منهجية AccountService.balances() لكن بفلترة تاريخ.
        BigDecimal totalOpeningBalance = accountService.totalOpeningBalance();
        BigDecimal netBeforeFrom = accountTransactionRepository.findByTransactionDateBefore(from).stream()
                .map(t -> t.getDirection() == TxDirection.IN ? t.getAmount() : t.getAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal openingCash = totalOpeningBalance.add(netBeforeFrom);
        BigDecimal closingCash = openingCash.add(netChange);

        return new CashFlowStatementDto(from, to, operatingNet, investingNet, financingNet, netChange,
                openingCash, closingCash);
    }

    private BigDecimal netForSources(List<AccountTransaction> transactions, java.util.Set<AccountSourceType> sources) {
        return transactions.stream()
                .filter(t -> sources.contains(t.getSourceType()))
                .map(t -> t.getDirection() == TxDirection.IN ? t.getAmount() : t.getAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** تعمير الذمم المدينة (العملاء): كل فاتورة بيع مستحقة تُصنَّف حسب عمرها (أيام منذ الإصدار)، مجمّعة بالعميل. */
    @Transactional(readOnly = true)
    public List<AgingBucketDto> receivablesAging() {
        List<SalesInvoice> outstanding = salesInvoiceRepository.findAllOutstanding();
        if (outstanding.isEmpty()) return List.of();

        List<Long> invoiceIds = outstanding.stream().map(SalesInvoice::getId).toList();
        Map<Long, BigDecimal> returnedByInvoice = new LinkedHashMap<>();
        for (Object[] row : salesReturnRepository.sumReturnedValueByInvoiceIds(invoiceIds)) {
            returnedByInvoice.put((Long) row[0], (BigDecimal) row[1]);
        }

        Map<Long, AgingAgg> byParty = new LinkedHashMap<>();
        for (SalesInvoice inv : outstanding) {
            BigDecimal returned = returnedByInvoice.getOrDefault(inv.getId(), BigDecimal.ZERO);
            BigDecimal due = inv.getGrandTotal().subtract(returned).subtract(inv.getPaidAmount());
            if (due.signum() <= 0) continue;
            Long partyId = inv.getCustomer() != null ? inv.getCustomer().getId() : 0L;
            String partyName = inv.getCustomer() != null ? inv.getCustomer().getName() : "بدون عميل محدد";
            LocalDate anchorDate = inv.getDueDate() != null ? inv.getDueDate() : inv.getCreatedAt().toLocalDate();
            addToAgingBucket(byParty, partyId, partyName, anchorDate, due);
        }
        return toAgingList(byParty);
    }

    /** تعمير الذمم الدائنة (الموردين): نفس منهجية العملاء. */
    @Transactional(readOnly = true)
    public List<AgingBucketDto> payablesAging() {
        List<PurchaseInvoice> outstanding = purchaseInvoiceRepository.findAllOutstanding();
        if (outstanding.isEmpty()) return List.of();

        List<Long> invoiceIds = outstanding.stream().map(PurchaseInvoice::getId).toList();
        Map<Long, BigDecimal> returnedByInvoice = new LinkedHashMap<>();
        for (Object[] row : purchaseReturnRepository.sumReturnedValueByInvoiceIds(invoiceIds)) {
            returnedByInvoice.put((Long) row[0], (BigDecimal) row[1]);
        }

        Map<Long, AgingAgg> byParty = new LinkedHashMap<>();
        for (PurchaseInvoice inv : outstanding) {
            BigDecimal returned = returnedByInvoice.getOrDefault(inv.getId(), BigDecimal.ZERO);
            BigDecimal due = inv.getGrandTotal().subtract(returned).subtract(inv.getPaidAmount());
            if (due.signum() <= 0) continue;
            Long partyId = inv.getSupplier() != null ? inv.getSupplier().getId() : 0L;
            String partyName = inv.getSupplier() != null ? inv.getSupplier().getName() : "بدون مورد محدد";
            LocalDate anchorDate = inv.getDueDate() != null ? inv.getDueDate() : inv.getCreatedAt().toLocalDate();
            addToAgingBucket(byParty, partyId, partyName, anchorDate, due);
        }
        return toAgingList(byParty);
    }

    private void addToAgingBucket(Map<Long, AgingAgg> byParty, Long partyId, String partyName,
                                   LocalDate invoiceDate, BigDecimal due) {
        long ageDays = java.time.temporal.ChronoUnit.DAYS.between(invoiceDate, LocalDate.now());
        AgingAgg agg = byParty.computeIfAbsent(partyId, id -> new AgingAgg(partyName));
        if (ageDays <= 30) agg.current = agg.current.add(due);
        else if (ageDays <= 60) agg.days31to60 = agg.days31to60.add(due);
        else if (ageDays <= 90) agg.days61to90 = agg.days61to90.add(due);
        else agg.over90 = agg.over90.add(due);
    }

    private List<AgingBucketDto> toAgingList(Map<Long, AgingAgg> byParty) {
        List<AgingBucketDto> result = new ArrayList<>();
        for (Map.Entry<Long, AgingAgg> entry : byParty.entrySet()) {
            AgingAgg agg = entry.getValue();
            BigDecimal total = agg.current.add(agg.days31to60).add(agg.days61to90).add(agg.over90);
            result.add(new AgingBucketDto(entry.getKey(), agg.partyName, agg.current, agg.days31to60,
                    agg.days61to90, agg.over90, total));
        }
        result.sort((a, b) -> b.total().compareTo(a.total()));
        return result;
    }

    private static class AgingAgg {
        final String partyName;
        BigDecimal current = BigDecimal.ZERO;
        BigDecimal days31to60 = BigDecimal.ZERO;
        BigDecimal days61to90 = BigDecimal.ZERO;
        BigDecimal over90 = BigDecimal.ZERO;

        AgingAgg(String partyName) {
            this.partyName = partyName;
        }
    }

    @Transactional(readOnly = true)
    public List<InventoryValueDto> inventoryValue(Long warehouseId) {
        List<StockItem> items = warehouseId != null
                ? stockItemRepository.findByWarehouseId(warehouseId)
                : stockItemRepository.findAll();

        List<InventoryValueDto> result = new ArrayList<>();
        for (StockItem item : items) {
            if (item.getQuantity() == null || item.getQuantity().signum() <= 0) continue;
            BigDecimal unitCost = item.getProduct().getPurchasePrice();
            BigDecimal value = unitCost.multiply(item.getQuantity());
            result.add(new InventoryValueDto(
                    item.getWarehouse().getId(), item.getWarehouse().getName(),
                    item.getProduct().getId(), item.getProduct().getName(), item.getProduct().getSku(),
                    item.getQuantity(), unitCost, value
            ));
        }
        return result;
    }

    /**
     * الأكثر مبيعاً حسب الكمية: يبدأ من مبيعات الفترة المؤكدة، ثم يخصم مرتجعات فواتير هذه الفترة
     * (بنفس منهجية financialReport - حسب فترة الفاتورة الأصلية) حتى لا يظهر منتج أُرجعت أغلب كمياته
     * كأنه "الأكثر مبيعاً"، ولا يظهر بفترة أخرى برقم سالب بسبب إرجاع بيع قديم.
     */
    @Transactional(readOnly = true)
    public List<TopProductDto> topProducts(LocalDate from, LocalDate to, int limit) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        Map<Long, ProductAgg> byProduct = new LinkedHashMap<>();
        for (SalesInvoice invoice : salesInvoiceRepository.findConfirmedWithItemsBetween(start, end)) {
            for (SalesInvoiceItem item : invoice.getItems()) {
                ProductAgg agg = byProduct.computeIfAbsent(item.getProduct().getId(),
                        id -> new ProductAgg(item.getProduct().getName(), item.getProduct().getSku()));
                agg.quantity = agg.quantity.add(item.getQuantity());
                agg.revenue = agg.revenue.add(item.getLineTotal());
            }
        }
        for (SalesReturn salesReturn : salesReturnRepository.findByInvoiceCreatedAtBetween(start, end)) {
            for (SalesReturnItem item : salesReturn.getItems()) {
                ProductAgg agg = byProduct.computeIfAbsent(item.getProduct().getId(),
                        id -> new ProductAgg(item.getProduct().getName(), item.getProduct().getSku()));
                agg.quantity = agg.quantity.subtract(item.getQuantity());
                agg.revenue = agg.revenue.subtract(item.getLineValue());
            }
        }

        return byProduct.entrySet().stream()
                .filter(e -> e.getValue().quantity.signum() > 0)
                .sorted((a, b) -> b.getValue().quantity.compareTo(a.getValue().quantity))
                .limit(limit)
                .map(e -> new TopProductDto(e.getKey(), e.getValue().name, e.getValue().sku,
                        e.getValue().quantity, e.getValue().revenue))
                .toList();
    }

    /**
     * الأكثر شراءً من العملاء: إجمالي فواتير المبيعات المؤكدة خلال الفترة، مخصوماً منه قيمة مرتجعات
     * فواتير نفس الفترة (حسب تاريخ الفاتورة الأصلية)، بنفس منهجية financialReport.
     */
    @Transactional(readOnly = true)
    public List<TopPartyDto> topCustomers(LocalDate from, LocalDate to, int limit) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        Map<Long, PartyAgg> byCustomer = new LinkedHashMap<>();
        for (SalesInvoice invoice : salesInvoiceRepository.findConfirmedWithItemsBetween(start, end)) {
            if (invoice.getCustomer() == null) continue;
            PartyAgg agg = byCustomer.computeIfAbsent(invoice.getCustomer().getId(),
                    id -> new PartyAgg(invoice.getCustomer().getName()));
            agg.invoiceCount++;
            agg.amount = agg.amount.add(invoice.getGrandTotal());
        }
        for (SalesReturn salesReturn : salesReturnRepository.findByInvoiceCreatedAtBetween(start, end)) {
            var customer = salesReturn.getSalesInvoice().getCustomer();
            if (customer == null) continue;
            PartyAgg agg = byCustomer.computeIfAbsent(customer.getId(), id -> new PartyAgg(customer.getName()));
            agg.amount = agg.amount.subtract(salesReturn.getTotalValue());
        }

        return byCustomer.entrySet().stream()
                .filter(e -> e.getValue().amount.signum() > 0)
                .sorted((a, b) -> b.getValue().amount.compareTo(a.getValue().amount))
                .limit(limit)
                .map(e -> new TopPartyDto(e.getKey(), e.getValue().name, e.getValue().invoiceCount, e.getValue().amount))
                .toList();
    }

    /**
     * الأكثر تعاملاً من الموردين: إجمالي فواتير الشراء المؤكدة خلال الفترة، مخصوماً منه قيمة مرتجعات
     * فواتير نفس الفترة (حسب تاريخ الفاتورة الأصلية)، بنفس منهجية topCustomers.
     */
    @Transactional(readOnly = true)
    public List<TopPartyDto> topSuppliers(LocalDate from, LocalDate to, int limit) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        Map<Long, PartyAgg> bySupplier = new LinkedHashMap<>();
        for (PurchaseInvoice invoice : purchaseInvoiceRepository.findActiveWithSupplierBetween(start, end)) {
            if (invoice.getSupplier() == null) continue;
            PartyAgg agg = bySupplier.computeIfAbsent(invoice.getSupplier().getId(),
                    id -> new PartyAgg(invoice.getSupplier().getName()));
            agg.invoiceCount++;
            agg.amount = agg.amount.add(invoice.getGrandTotal());
        }
        for (PurchaseReturn purchaseReturn : purchaseReturnRepository.findByInvoiceCreatedAtBetween(start, end)) {
            var supplier = purchaseReturn.getPurchaseInvoice().getSupplier();
            if (supplier == null) continue;
            PartyAgg agg = bySupplier.computeIfAbsent(supplier.getId(), id -> new PartyAgg(supplier.getName()));
            agg.amount = agg.amount.subtract(purchaseReturn.getTotalValue());
        }

        return bySupplier.entrySet().stream()
                .filter(e -> e.getValue().amount.signum() > 0)
                .sorted((a, b) -> b.getValue().amount.compareTo(a.getValue().amount))
                .limit(limit)
                .map(e -> new TopPartyDto(e.getKey(), e.getValue().name, e.getValue().invoiceCount, e.getValue().amount))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StockMovementSummaryDto> stockMovementSummary(LocalDate from, LocalDate to, String groupBy, Long warehouseId) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<StockMovement> movements = stockMovementRepository.findForSummaryBetween(start, end, warehouseId);

        record Key(String period, Long productId) {}
        Map<Key, StockMovementSummaryDto> byKey = new LinkedHashMap<>();
        Map<Key, String[]> productInfo = new LinkedHashMap<>();

        for (StockMovement m : movements) {
            String period = periodLabel(m.getCreatedAt(), groupBy);
            Key key = new Key(period, m.getProduct().getId());
            StockMovementSummaryDto existing = byKey.get(key);
            BigDecimal in = existing != null ? existing.quantityIn() : BigDecimal.ZERO;
            BigDecimal out = existing != null ? existing.quantityOut() : BigDecimal.ZERO;
            if (m.getQuantity().signum() > 0) {
                in = in.add(m.getQuantity());
            } else {
                out = out.add(m.getQuantity().abs());
            }
            byKey.put(key, new StockMovementSummaryDto(period, m.getProduct().getId(), m.getProduct().getName(),
                    m.getProduct().getSku(), in, out, in.subtract(out)));
        }

        List<StockMovementSummaryDto> result = new ArrayList<>(byKey.values());
        result.sort(Comparator.comparing(StockMovementSummaryDto::period).thenComparing(StockMovementSummaryDto::productName));
        return result;
    }

    private String periodLabel(LocalDateTime dateTime, String groupBy) {
        if ("month".equalsIgnoreCase(groupBy)) {
            return dateTime.format(MONTH_FORMAT);
        }
        if ("week".equalsIgnoreCase(groupBy)) {
            WeekFields weekFields = WeekFields.ISO;
            int week = dateTime.get(weekFields.weekOfWeekBasedYear());
            int weekYear = dateTime.get(weekFields.weekBasedYear());
            return String.format("%d-W%02d", weekYear, week);
        }
        return dateTime.format(DAY_FORMAT);
    }

    private static class Accumulator {
        long salesCount = 0;
        BigDecimal salesTotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal costOfGoodsSold = BigDecimal.ZERO;
        BigDecimal damagedLoss = BigDecimal.ZERO;
        BigDecimal expensesTotal = BigDecimal.ZERO;
        BigDecimal purchasesTotal = BigDecimal.ZERO;
    }

    private static class ProductAgg {
        final String name;
        final String sku;
        BigDecimal quantity = BigDecimal.ZERO;
        BigDecimal revenue = BigDecimal.ZERO;

        ProductAgg(String name, String sku) {
            this.name = name;
            this.sku = sku;
        }
    }

    private static class PartyAgg {
        final String name;
        long invoiceCount = 0;
        BigDecimal amount = BigDecimal.ZERO;

        PartyAgg(String name) {
            this.name = name;
        }
    }
}
