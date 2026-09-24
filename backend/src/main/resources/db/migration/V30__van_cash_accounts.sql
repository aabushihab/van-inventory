-- صندوق نقدي لكل سيارة توزيع: يُسجَّل فيه ما يحصّله المندوب من المبيعات، ويُسلَّم للإدارة عند التسوية.
-- Each van gets its own cash box account for the money its salesman collects.
ALTER TABLE vans ADD COLUMN cash_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;

-- صندوق رئيسي افتراضي حتى تعمل الدفعات النقدية من أول تشغيل
INSERT INTO accounts (name, type, branch_id, opening_balance, active)
SELECT 'الصندوق الرئيسي', 'CASH', (SELECT id FROM branches ORDER BY id LIMIT 1), 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM accounts);
