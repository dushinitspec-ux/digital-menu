-- Тариф организации. complimentary — бесплатный доступ (партнёры, первые сети): биллинг их не трогает.
alter table organizations
  add column plan text not null default 'standard' check (plan in ('standard', 'complimentary'));
