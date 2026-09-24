-- وظيفة الموظف صارت من قائمة ثابتة (رمز)، وسائق السيارة صار موظفاً وظيفته سائق.
-- Employee position is now a fixed code; a van's driver is an employee whose position is DRIVER.
UPDATE employees SET position = 'OTHER'
WHERE position IS NULL OR position NOT IN
    ('DRIVER', 'SALESMAN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'CASHIER', 'MANAGER', 'WORKER', 'OTHER');

ALTER TABLE employees ALTER COLUMN position SET NOT NULL;
ALTER TABLE employees ADD CONSTRAINT chk_employee_position CHECK (position IN
    ('DRIVER', 'SALESMAN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT', 'CASHIER', 'MANAGER', 'WORKER', 'OTHER'));

ALTER TABLE vans ADD COLUMN driver_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;
