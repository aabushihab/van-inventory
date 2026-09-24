package com.vanerp.repository;

import com.vanerp.model.VanLoadRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VanLoadRequestRepository extends JpaRepository<VanLoadRequest, Long> {
    List<VanLoadRequest> findByVanIdOrderByCreatedAtDesc(Long vanId);

    List<VanLoadRequest> findAllByOrderByCreatedAtDesc();

    List<VanLoadRequest> findByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);
}
