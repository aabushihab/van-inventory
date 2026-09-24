package com.vanerp.service;

import com.vanerp.dto.EmployeeDto;
import com.vanerp.exception.ApiException;
import com.vanerp.model.Employee;
import com.vanerp.model.EmployeePosition;
import com.vanerp.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<EmployeeDto> findAll() {
        return employeeRepository.findAllByOrderByNameAsc().stream().map(this::toDto).toList();
    }

    /** الموظفون الفعّالون الذين وظيفتهم سائق - لاختيار سائق سيارة التوزيع. */
    @Transactional(readOnly = true)
    public List<EmployeeDto> findActiveDrivers() {
        return employeeRepository.findByPositionAndActiveTrueOrderByNameAsc(EmployeePosition.DRIVER.name())
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public EmployeeDto create(EmployeeDto dto) {
        Employee employee = Employee.builder()
                .name(dto.name()).position(dto.position()).monthlySalary(dto.monthlySalary())
                .phone(dto.phone()).active(true).build();
        return toDto(employeeRepository.save(employee));
    }

    @Transactional
    public EmployeeDto update(Long id, EmployeeDto dto) {
        Employee employee = getOrThrow(id);
        employee.setName(dto.name());
        employee.setPosition(dto.position());
        employee.setMonthlySalary(dto.monthlySalary());
        employee.setPhone(dto.phone());
        employee.setActive(dto.active());
        return toDto(employeeRepository.save(employee));
    }

    @Transactional
    public void delete(Long id) {
        Employee employee = getOrThrow(id);
        employeeRepository.delete(employee);
    }

    private Employee getOrThrow(Long id) {
        return employeeRepository.findById(id).orElseThrow(() -> ApiException.notFound("الموظف غير موجود"));
    }

    private EmployeeDto toDto(Employee e) {
        return new EmployeeDto(e.getId(), e.getName(), e.getPosition(), e.getMonthlySalary(), e.getPhone(), e.isActive());
    }
}
