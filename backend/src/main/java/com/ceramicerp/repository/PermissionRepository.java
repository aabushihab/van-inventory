package com.ceramicerp.repository;

import com.ceramicerp.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Permission findByCode(String code);
}
