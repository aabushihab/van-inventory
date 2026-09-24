package com.vanerp.repository;

import com.vanerp.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Permission findByCode(String code);
}
