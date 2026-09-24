package com.vanerp.repository;

import com.vanerp.model.FixedAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FixedAssetRepository extends JpaRepository<FixedAsset, Long> {

    List<FixedAsset> findAllByOrderByPurchaseDateDesc();
}
