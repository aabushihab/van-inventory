package com.vanerp.repository;

import com.vanerp.model.StocktakeSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StocktakeSessionRepository extends JpaRepository<StocktakeSession, Long> {

    List<StocktakeSession> findAllByOrderByCreatedAtDesc();
}
