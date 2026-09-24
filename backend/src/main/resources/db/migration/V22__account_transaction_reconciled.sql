-- علامة "مطابَقة مع كشف الحساب البنكي" لكل حركة، لتفادي حاجة تتبع منفصل بالتسوية البنكية.
ALTER TABLE account_transactions ADD COLUMN reconciled BOOLEAN NOT NULL DEFAULT FALSE;
