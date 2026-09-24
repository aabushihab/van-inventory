-- تعبئة السجلات القديمة (قبل إضافة عمود salary_period): نفترض أنها كانت تُحسب على شهر تاريخ حركتها الفعلي.
UPDATE expenses
SET salary_period = date_trunc('month', expense_date)::date
WHERE category IN ('رواتب', 'سلفة') AND employee_id IS NOT NULL AND salary_period IS NULL;
