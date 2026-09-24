package com.ceramicerp.service;

import com.ceramicerp.dto.AccountBalanceDto;
import com.ceramicerp.dto.AccountDto;
import com.ceramicerp.dto.AccountTransactionDto;
import com.ceramicerp.dto.RecordTransactionRequest;
import com.ceramicerp.dto.TransferRequest;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Account;
import com.ceramicerp.model.AccountSourceType;
import com.ceramicerp.model.AccountTransaction;
import com.ceramicerp.model.Branch;
import com.ceramicerp.model.TxDirection;
import com.ceramicerp.model.User;
import com.ceramicerp.repository.AccountRepository;
import com.ceramicerp.repository.AccountTransactionRepository;
import com.ceramicerp.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountTransactionRepository accountTransactionRepository;
    private final BranchRepository branchRepository;
    private final FiscalYearClosingService fiscalYearClosingService;

    @Transactional(readOnly = true)
    public List<AccountDto> findAll() {
        return accountRepository.findAllByOrderByNameAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public AccountDto create(AccountDto dto) {
        Branch branch = dto.branchId() != null
                ? branchRepository.findById(dto.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        Account account = Account.builder()
                .name(dto.name()).type(dto.type()).branch(branch)
                .openingBalance(dto.openingBalance() != null ? dto.openingBalance() : BigDecimal.ZERO)
                .active(true)
                .build();
        return toDto(accountRepository.save(account));
    }

    @Transactional
    public AccountDto update(Long id, AccountDto dto) {
        Account account = getOrThrow(id);
        Branch branch = dto.branchId() != null
                ? branchRepository.findById(dto.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        account.setName(dto.name());
        account.setType(dto.type());
        account.setBranch(branch);
        account.setOpeningBalance(dto.openingBalance() != null ? dto.openingBalance() : BigDecimal.ZERO);
        account.setActive(dto.active());
        return toDto(accountRepository.save(account));
    }

    @Transactional
    public void delete(Long id) {
        Account account = getOrThrow(id);
        accountRepository.delete(account);
    }

    /** الرصيد الحالي لكل حساب = الرصيد الافتتاحي + مجموع كل الحركات (IN موجب، OUT سالب) - محسوب مباشرة. */
    @Transactional(readOnly = true)
    public List<AccountBalanceDto> balances() {
        List<Account> accounts = accountRepository.findAllByOrderByNameAsc();
        Map<Long, BigDecimal> netByAccount = accountTransactionRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        t -> t.getAccount().getId(),
                        Collectors.reducing(BigDecimal.ZERO,
                                t -> t.getDirection() == TxDirection.IN ? t.getAmount() : t.getAmount().negate(),
                                BigDecimal::add)));
        return accounts.stream()
                .map(a -> new AccountBalanceDto(a.getId(), a.getName(), a.getType(),
                        a.getOpeningBalance().add(netByAccount.getOrDefault(a.getId(), BigDecimal.ZERO))))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AccountTransactionDto> ledger(Long accountId, LocalDate from, LocalDate to) {
        return accountTransactionRepository
                .findByAccountIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(accountId, from, to)
                .stream().map(this::toTransactionDto).toList();
    }

    @Transactional
    public AccountTransactionDto recordManualTransaction(RecordTransactionRequest request, User actingUser) {
        return toTransactionDto(recordTransaction(request, AccountSourceType.MANUAL, null, actingUser));
    }

    @Transactional
    public AccountTransactionDto recordCapitalTransaction(RecordTransactionRequest request, User actingUser) {
        AccountSourceType sourceType = request.direction() == TxDirection.IN
                ? AccountSourceType.CAPITAL_IN : AccountSourceType.CAPITAL_OUT;
        return toTransactionDto(recordTransaction(request, sourceType, null, actingUser));
    }

    /** تحويل مبلغ من حساب لآخر (كاش↔بنك): حركتان مرتبطتان بنفس sourceId (رقم التحويل)، OUT من المصدر و IN للوجهة. */
    @Transactional
    public void transfer(TransferRequest request, User actingUser) {
        if (request.fromAccountId().equals(request.toAccountId())) {
            throw ApiException.badRequest("لا يمكن التحويل لنفس الحساب");
        }
        Account from = getOrThrow(request.fromAccountId());
        Account to = getOrThrow(request.toAccountId());
        AccountTransaction outTx = recordTransaction(from.getId(), TxDirection.OUT, request.amount(),
                request.transactionDate(), AccountSourceType.TRANSFER, null,
                "تحويل إلى " + to.getName() + (request.notes() != null && !request.notes().isBlank() ? " - " + request.notes() : ""),
                actingUser);
        recordTransaction(to.getId(), TxDirection.IN, request.amount(),
                request.transactionDate(), AccountSourceType.TRANSFER, outTx.getId(),
                "تحويل من " + from.getName() + (request.notes() != null && !request.notes().isBlank() ? " - " + request.notes() : ""),
                actingUser);
    }

    /** يُستخدم داخلياً من ExpenseService/SalesInvoiceService/PurchaseInvoiceService/CheckService لتسجيل حركة مرتبطة بمصدر. */
    @Transactional
    public AccountTransaction recordTransaction(Long accountId, TxDirection direction, BigDecimal amount,
                                                 LocalDate transactionDate, AccountSourceType sourceType,
                                                 Long sourceId, String notes, User actingUser) {
        fiscalYearClosingService.latestClosingDate()
                .filter(closed -> !transactionDate.isAfter(closed))
                .ifPresent(closed -> {
                    throw ApiException.badRequest("لا يمكن تسجيل حركة بتاريخ ضمن فترة مالية مقفلة (حتى " + closed + ")");
                });
        Account account = getOrThrow(accountId);
        AccountTransaction tx = AccountTransaction.builder()
                .account(account).direction(direction).amount(amount).transactionDate(transactionDate)
                .sourceType(sourceType).sourceId(sourceId).notes(notes).createdBy(actingUser)
                .build();
        return accountTransactionRepository.save(tx);
    }

    /** حذف الحركة المرتبطة بمصدر معيّن (عند حذف/تعديل المصدر نفسه) - لا خطأ إن لم توجد. */
    @Transactional
    public void deleteBySource(AccountSourceType sourceType, Long sourceId) {
        accountTransactionRepository.findFirstBySourceTypeAndSourceId(sourceType, sourceId)
                .ifPresent(accountTransactionRepository::delete);
    }

    private AccountTransaction recordTransaction(RecordTransactionRequest request, AccountSourceType sourceType,
                                                   Long sourceId, User actingUser) {
        return recordTransaction(request.accountId(), request.direction(), request.amount(),
                request.transactionDate(), sourceType, sourceId, request.notes(), actingUser);
    }

    private Account getOrThrow(Long id) {
        return accountRepository.findById(id).orElseThrow(() -> ApiException.notFound("الحساب غير موجود"));
    }

    /** مرجع الكيان الفعلي - يُستخدم من خدمات أخرى (CheckService) لربط حقل account مباشرة. */
    public Account getAccountRef(Long id) {
        return getOrThrow(id);
    }

    /** مجموع الأرصدة الافتتاحية لكل الحسابات - يُستخدم لحساب الرصيد الافتتاحي بقائمة التدفقات النقدية. */
    @Transactional(readOnly = true)
    public BigDecimal totalOpeningBalance() {
        return accountRepository.findAllByOrderByNameAsc().stream()
                .map(Account::getOpeningBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private AccountDto toDto(Account a) {
        return new AccountDto(a.getId(), a.getName(), a.getType(),
                a.getBranch() != null ? a.getBranch().getId() : null,
                a.getBranch() != null ? a.getBranch().getName() : null,
                a.getOpeningBalance(), a.isActive());
    }

    @Transactional
    public AccountTransactionDto setReconciled(Long transactionId, boolean reconciled) {
        AccountTransaction tx = accountTransactionRepository.findById(transactionId)
                .orElseThrow(() -> ApiException.notFound("الحركة غير موجودة"));
        tx.setReconciled(reconciled);
        return toTransactionDto(accountTransactionRepository.save(tx));
    }

    private AccountTransactionDto toTransactionDto(AccountTransaction t) {
        return new AccountTransactionDto(t.getId(), t.getAccount().getId(), t.getAccount().getName(),
                t.getDirection(), t.getAmount(), t.getTransactionDate(), t.getSourceType(), t.getSourceId(),
                t.getNotes(), t.isReconciled(), t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null, t.getCreatedAt());
    }
}
