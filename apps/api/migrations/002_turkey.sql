-- Турция: цены в лирах и турецкий язык меню на экранах (подписи «Tükendi», «Yeni», формат «1.250 ₺»).

alter table organizations drop constraint organizations_currency_check;
alter table organizations add constraint organizations_currency_check check (currency in ('RUB', 'EUR', 'TRY'));

alter table organizations drop constraint organizations_locale_check;
alter table organizations add constraint organizations_locale_check check (locale in ('ru', 'en', 'tr'));
