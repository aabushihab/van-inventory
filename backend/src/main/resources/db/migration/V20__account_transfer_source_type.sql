-- إضافة TRANSFER كنوع مصدر حركة، لتمييز التحويل بين حسابين (كاش↔بنك) عن الحركة اليدوية العامة.
ALTER TABLE account_transactions DROP CONSTRAINT account_transactions_source_type_check;
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_source_type_check
    CHECK (source_type IN ('SALES_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE', 'CAPITAL_IN', 'CAPITAL_OUT',
                            'CHECK_CLEARED', 'MANUAL', 'TRANSFER'));
