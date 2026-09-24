package com.ceramicerp.service;

import com.ceramicerp.dto.FixedAssetDisposeRequest;
import com.ceramicerp.dto.FixedAssetDto;
import com.ceramicerp.dto.FixedAssetRequest;
import com.ceramicerp.exception.ApiException;
import com.ceramicerp.model.Account;
import com.ceramicerp.model.AccountSourceType;
import com.ceramicerp.model.Branch;
import com.ceramicerp.model.FixedAsset;
import com.ceramicerp.model.FixedAssetStatus;
import com.ceramicerp.model.TxDirection;
import com.ceramicerp.model.User;
import com.ceramicerp.repository.BranchRepository;
import com.ceramicerp.repository.FixedAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FixedAssetService {

    private final FixedAssetRepository fixedAssetRepository;
    private final BranchRepository branchRepository;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public List<FixedAssetDto> findAll() {
        return fixedAssetRepository.findAllByOrderByPurchaseDateDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public FixedAssetDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    /** ينشئ الأصل، ويسجّل حركة صرف نقدي (FIXED_ASSET_PURCHASE) تلقائياً فقط إن أُعطي حساب لدفع الثمن منه. */
    @Transactional
    public FixedAssetDto create(FixedAssetRequest request, User actingUser) {
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        Account account = request.accountId() != null ? accountService.getAccountRef(request.accountId()) : null;

        FixedAsset asset = FixedAsset.builder()
                .name(request.name()).category(request.category())
                .purchaseDate(request.purchaseDate()).purchaseCost(request.purchaseCost())
                .salvageValue(request.salvageValue() != null ? request.salvageValue() : BigDecimal.ZERO)
                .usefulLifeMonths(request.usefulLifeMonths())
                .account(account).branch(branch)
                .status(FixedAssetStatus.ACTIVE)
                .notes(request.notes()).createdBy(actingUser)
                .build();
        FixedAsset saved = fixedAssetRepository.save(asset);

        if (account != null) {
            accountService.recordTransaction(account.getId(), TxDirection.OUT, request.purchaseCost(),
                    request.purchaseDate(), AccountSourceType.FIXED_ASSET_PURCHASE, saved.getId(),
                    "شراء أصل ثابت: " + saved.getName(), actingUser);
        }
        return toDto(saved);
    }

    @Transactional
    public FixedAssetDto update(Long id, FixedAssetRequest request, User actingUser) {
        FixedAsset asset = getOrThrow(id);
        if (asset.getStatus() != FixedAssetStatus.ACTIVE) {
            throw ApiException.badRequest("لا يمكن تعديل أصل مُصفّى");
        }
        Branch branch = request.branchId() != null
                ? branchRepository.findById(request.branchId()).orElseThrow(() -> ApiException.notFound("الفرع غير موجود"))
                : null;
        asset.setName(request.name());
        asset.setCategory(request.category());
        asset.setPurchaseDate(request.purchaseDate());
        asset.setPurchaseCost(request.purchaseCost());
        asset.setSalvageValue(request.salvageValue() != null ? request.salvageValue() : BigDecimal.ZERO);
        asset.setUsefulLifeMonths(request.usefulLifeMonths());
        asset.setBranch(branch);
        asset.setNotes(request.notes());
        return toDto(fixedAssetRepository.save(asset));
    }

    /** يعلّم الأصل مُصفّى، ويسجّل دخول نقدي (FIXED_ASSET_SALE) اختيارياً إن أُعطيت قيمة بيع وحساب. */
    @Transactional
    public FixedAssetDto dispose(Long id, FixedAssetDisposeRequest request, User actingUser) {
        FixedAsset asset = getOrThrow(id);
        if (asset.getStatus() == FixedAssetStatus.DISPOSED) {
            throw ApiException.badRequest("الأصل مُصفّى مسبقاً");
        }
        asset.setStatus(FixedAssetStatus.DISPOSED);
        asset.setDisposedDate(request.disposedDate());
        FixedAsset saved = fixedAssetRepository.save(asset);

        if (request.saleAmount() != null && request.saleAmount().signum() > 0 && request.accountId() != null) {
            accountService.recordTransaction(request.accountId(), TxDirection.IN, request.saleAmount(),
                    request.disposedDate(), AccountSourceType.FIXED_ASSET_SALE, saved.getId(),
                    "بيع/تصفية أصل ثابت: " + saved.getName()
                            + (request.notes() != null && !request.notes().isBlank() ? " - " + request.notes() : ""),
                    actingUser);
        }
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        FixedAsset asset = getOrThrow(id);
        accountService.deleteBySource(AccountSourceType.FIXED_ASSET_PURCHASE, id);
        accountService.deleteBySource(AccountSourceType.FIXED_ASSET_SALE, id);
        fixedAssetRepository.delete(asset);
    }

    private FixedAsset getOrThrow(Long id) {
        return fixedAssetRepository.findById(id).orElseThrow(() -> ApiException.notFound("الأصل الثابت غير موجود"));
    }

    private FixedAssetDto toDto(FixedAsset a) {
        LocalDate endDate = a.getDisposedDate() != null ? a.getDisposedDate() : LocalDate.now();
        long monthsElapsed = Math.min(a.getUsefulLifeMonths(),
                Math.max(0, ChronoUnit.MONTHS.between(a.getPurchaseDate(), endDate)));
        BigDecimal depreciableBase = a.getPurchaseCost().subtract(a.getSalvageValue());
        BigDecimal monthlyDepreciation = a.getUsefulLifeMonths() > 0
                ? depreciableBase.divide(BigDecimal.valueOf(a.getUsefulLifeMonths()), 3, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal accumulatedDepreciation = monthlyDepreciation.multiply(BigDecimal.valueOf(monthsElapsed));
        BigDecimal netBookValue = a.getPurchaseCost().subtract(accumulatedDepreciation);

        return new FixedAssetDto(
                a.getId(), a.getName(), a.getCategory(), a.getPurchaseDate(), a.getPurchaseCost(), a.getSalvageValue(),
                a.getUsefulLifeMonths(),
                a.getAccount() != null ? a.getAccount().getId() : null,
                a.getAccount() != null ? a.getAccount().getName() : null,
                a.getBranch() != null ? a.getBranch().getId() : null,
                a.getBranch() != null ? a.getBranch().getName() : null,
                a.getStatus(), a.getDisposedDate(), a.getNotes(),
                monthsElapsed, accumulatedDepreciation, netBookValue,
                a.getCreatedBy() != null ? a.getCreatedBy().getFullName() : null, a.getCreatedAt()
        );
    }
}
