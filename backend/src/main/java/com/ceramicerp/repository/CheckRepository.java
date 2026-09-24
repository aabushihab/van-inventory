package com.ceramicerp.repository;

import com.ceramicerp.model.Check;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CheckRepository extends JpaRepository<Check, Long> {

    @Query("""
        SELECT c FROM Check c
        WHERE (CAST(:status AS string) IS NULL OR CAST(c.status AS string) = CAST(:status AS string))
        ORDER BY c.dueDate ASC, c.id DESC
        """)
    Page<Check> search(@Param("status") String status, Pageable pageable);
}
