package com.ceramicerp.service;

import com.ceramicerp.dto.ExpenseDto;
import com.ceramicerp.dto.ExpenseRequest;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Account;
import com.ceramicerp.model.AccountSourceType;
import com.ceramicerp.model.Branch;
import com.ceramicerp.model.Employee;
import com.ceramicerp.model.Expense;
import com.ceramicerp.model.TxDirection;
import com.ceramicerp.model.User;
import com.ceramicerp.repository.BranchRepository;
import com.ceramicerp.repository.EmployeeRepository;
import com.ceramicerp.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    /** فئات المصاريف اللي لازم تُربط بموظف محدد (سند قبض راتب/سلفة). */
    private static final Set<String> EMPLOYEE_REQUIRED_CATEGORIES = Set.of("رواتب", "سلفة");

    private final ExpenseRepository expenseRepository;
    private final BranchRepository branchRepository;
    private final EmployeeRepository employeeRepository;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public Page<ExpenseDto> search(String q, java.time.LocalDate from, java.time.LocalDate to, Pageable pageable) {
        return expenseRepository.search(q, from, to, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public ExpenseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional(readOnly = true)
    public java.util.List<ExpenseDto> byEmployee(Long employeeId) {
        return expenseRepository.findByEmployeeIdOrderByExpenseDateDesc(employeeId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public java.util.Map<Long, java.math.BigDecimal> salaryPaidByEmployee(java.time.LocalDate from, java.time.LocalDate to) {
        return expenseRepository.sumByEmployeeAndCategoriesBetweenPeriod(EMPLOYEE_REQUIRED_CATEGORIES, from, to).stream()
                .collect(java.util.stream.Collectors.toMap(
                        r -> (Long) r[0], r -> (java.math.BigDecimal) r[1]));
    }

    @Transactional
    public ExpenseDto create(ExpenseRequest request, User actingUser) {
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل مصروف");
        }
        Employee employee = resolveEmployee(request);
        java.time.LocalDate salaryPeriod = resolveSalaryPeriod(request);
        validateMonthlyCap(employee, request, salaryPeriod, null);
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
        Expense expense = Expense.builder()
                .category(request.category()).amount(request.amount()).expenseDate(request.expenseDate())
                .salaryPeriod(salaryPeriod)
                .notes(request.notes()).branch(branch).employee(employee).account(account)
                .receiptImage(request.receiptImage())
                .createdBy(actingUser)
                .build();
        Expense saved = expenseRepository.save(expense);
        syncAccountTransaction(saved, request, actingUser);
        return toDto(saved);
    }

    @Transactional
    public ExpenseDto update(Long id, ExpenseRequest request, User actingUser) {
        if (request.accountId() == null) {
            throw ApiException.badRequest("يجب اختيار الحساب (كاش/بنك) عند تسجيل مصروف");
        }
        Expense expense = getOrThrow(id);
        Employee employee = resolveEmployee(request);
        java.time.LocalDate salaryPeriod = resolveSalaryPeriod(request);
        validateMonthlyCap(employee, request, salaryPeriod, id);
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setExpenseDate(request.expenseDate());
        expense.setSalaryPeriod(salaryPeriod);
        expense.setNotes(request.notes());
        expense.setBranch(branch);
        expense.setEmployee(employee);
        expense.setAccount(account);
        expense.setReceiptImage(request.receiptImage());
        Expense saved = expenseRepository.save(expense);
        accountService.deleteBySource(AccountSourceType.EXPENSE, id);
        syncAccountTransaction(saved, request, actingUser);
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Expense expense = getOrThrow(id);
        accountService.deleteBySource(AccountSourceType.EXPENSE, id);
        expenseRepository.delete(expense);
    }

    /** يُنشئ حركة حساب OUT مقابلة عند ربط المصروف بحساب فعلي - المصروف دائماً خروج كاش. */
    private void syncAccountTransaction(Expense expense, ExpenseRequest request, User actingUser) {
        if (request.accountId() == null) return;
        accountService.recordTransaction(request.accountId(), TxDirection.OUT, request.amount(),
                request.expenseDate(), AccountSourceType.EXPENSE, expense.getId(),
                "مصروف: " + request.category(), actingUser);
    }

    /** فئات الرواتب/السلف لازم تُربط بموظف - سند إثبات إنه هذا الموظف قبض المبلغ. */
    private Employee resolveEmployee(ExpenseRequest request) {
        boolean requiresEmployee = EMPLOYEE_REQUIRED_CATEGORIES.contains(request.category());
        if (requiresEmployee && request.employeeId() == null) {
            throw ApiException.badRequest("لازم تحدد الموظف عند اختيار فئة \"" + request.category() + "\"");
        }
        if (request.employeeId() == null) return null;
        return employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> ApiException.notFound("الموظف غير موجود"));
    }

    /** شهر الرواتب/السلف اللي يُحسب عليه المصروف - إلزامي لفئتي "رواتب"/"سلفة"، يُطبَّع دائماً ليوم 1. */
    private java.time.LocalDate resolveSalaryPeriod(ExpenseRequest request) {
        boolean requiresPeriod = EMPLOYEE_REQUIRED_CATEGORIES.contains(request.category());
        if (!requiresPeriod) return null;
        if (request.salaryPeriod() == null) {
            throw ApiException.badRequest("لازم تحدد الشهر الذي يُحسب عليه المبلغ عند اختيار فئة \"" + request.category() + "\"");
        }
        return request.salaryPeriod().withDayOfMonth(1);
    }

    /** مجموع الرواتب والسلف المستلمة لموظف بشهر يُحسب عليه لا يتجاوز راتبه الشهري (بصرف النظر عن تاريخ الحركة الفعلي). */
    private void validateMonthlyCap(Employee employee, ExpenseRequest request, java.time.LocalDate salaryPeriod, Long excludeId) {
        if (employee == null || salaryPeriod == null) return;
        java.time.LocalDate from = salaryPeriod.withDayOfMonth(1);
        java.time.LocalDate to = salaryPeriod.withDayOfMonth(salaryPeriod.lengthOfMonth());
        java.math.BigDecimal existing = expenseRepository.sumAmountForEmployeeInPeriod(
                employee.getId(), EMPLOYEE_REQUIRED_CATEGORIES, from, to, excludeId != null ? excludeId : -1L);
        java.math.BigDecimal remaining = employee.getMonthlySalary().subtract(existing);
        if (request.amount().compareTo(remaining) > 0) {
            throw ApiException.badRequest(
                    "المبلغ يتجاوز الراتب الشهري المتبقي لـ" + employee.getName() + " عن شهر "
                    + from.getYear() + "-" + String.format("%02d", from.getMonthValue())
                    + " (المتبقي: " + remaining + ")");
        }
    }

    private Expense getOrThrow(Long id) {
        return expenseRepository.findById(id).orElseThrow(() -> ApiException.notFound("المصروف غير موجود"));
    }

    private ExpenseDto toDto(Expense e) {
        return new ExpenseDto(
                e.getId(), e.getCategory(), e.getAmount(), e.getExpenseDate(), e.getSalaryPeriod(), e.getNotes(),
                e.getBranch() != null ? e.getBranch().getId() : null,
                e.getBranch() != null ? e.getBranch().getName() : null,
                e.getEmployee() != null ? e.getEmployee().getId() : null,
                e.getEmployee() != null ? e.getEmployee().getName() : null,
                e.getAccount() != null ? e.getAccount().getId() : null,
                e.getAccount() != null ? e.getAccount().getName() : null,
                e.getReceiptImage(),
                e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : null,
                e.getCreatedAt()
        );
    }
}
