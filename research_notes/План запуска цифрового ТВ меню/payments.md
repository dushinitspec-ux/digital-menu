# Платёжные провайдеры для подписок (цифровое ТВ-меню, оплата за экран в месяц): Россия и ЕС, состояние на 30.10.2026

> **Как собраны данные (важно для автора отчёта).** В этой сессии WebFetch не работал ни для одного внешнего сайта: yookassa.ru, cloudpayments.ru, tbank.ru, robokassa.com, prodamus.ru, stripe.com и timeweb.com возвращали `ENOTFOUND` (домены вне разрешённого сетевого списка сессии). Поэтому все цифры ниже взяты из **поисковых сводок по официальным страницам** (WebSearch с фильтром по домену провайдера), а не из прямого чтения страниц. После 18 запросов общий лимит WebSearch на ход (200 запросов на всех агентов) закончился, и часть вопросов осталась без ответа (см. «Gaps»). Каждую цифру перед публикацией нужно сверить на странице по ссылке. Всё, что я пишу по собственным знаниям без источника, помечено «не подтверждено / not confirmed».

## 1. Россия: ЮKassa, CloudPayments, Т-Касса, Robokassa, Prodamus (+ опционально Точка/Сбер, PayKeeper, Модульбанк)

### Takeaway
Для автосписаний за экран в месяц самый проработанный и подтверждённый вариант — **ЮKassa**: на Базовом тарифе (оборот до 3 млн ₽/мес) карты и SberPay стоят 3,5%, абонентской платы нет, автоплатежи включает менеджер, сохранять для автосписаний можно и СБП. **Robokassa** (карты 2,9–3,9%, СБП 1,8–2,7%, без абонентской платы, Робочеки 0,05%) и **Prodamus** (3,8% и +1% за автосписания в «Клубной системе», разовый тариф 10 000 ₽) обходятся дороже или имеют больше оговорок. У Т-Кассы и CloudPayments подтвердить карточные ставки и условия рекуррента не удалось. Для B2B-клиентов (кафе — это ИП или ООО) остаётся вариант «счёт + акт» по безналу, без эквайринга вообще.

### Cited Findings

**ЮKassa**
- Комиссия зависит от способа оплаты, вида деятельности и оборота. Базовый тариф действует по умолчанию, Premium доступен при обороте от 3 млн ₽/мес, индивидуальный — от 5 млн ₽/мес. При обороте до 3 млн ₽/мес карты Visa, Mastercard, Maestro, «Мир», JCB и **SberPay стоят 3,5%** (товары с доставкой, услуги, цифровые товары), для благотворительности — 2,8%. «НДС начисляется только на сумму комиссии, а не на сумму платежа» — [Тарифы ЮKassa](https://yookassa.ru/docs/support/payments/fees) (по поисковой сводке)
- Маркетинговые страницы пишут «от 2,8%»: это нижняя граница для крупных оборотов, а не ставка для малого бизнеса — [ЮKassa: эквайринг для ИП и малого бизнеса](https://yookassa.ru/internet-ekvayring-dlya-saytov/); [ЮKassa: онлайн-касса, ставка от 2,8%](https://yookassa.ru/tarify-dlya-online-kass/)
- **СБП: данные противоречат друг другу.** Одна страница ЮKassa даёт 0% за СБП (вероятно, промо), другие — «рассчитывается индивидуально». Лимиты СБП: до 700 000 ₽ за платёж и до 1 млн ₽ в сутки — [Способы приёма платежей ЮKassa](https://yookassa.ru/payments/); [Промо ЮKassa](https://promo.yookassa.ru/easy-business). Ставка СБП: **не подтверждено**
- SberPay для самозанятых — 3,5% без НДС, лимит до 700 000 ₽ за платёж — [ЮKassa: SberPay](https://yookassa.ru/sberpay/); [ЮKassa для самозанятых](https://yookassa.ru/platezhi-dlya-samozanyatyh/)
- Абонентской платы нет, комиссия берётся только с успешных платежей, подключение и форма оплаты бесплатны — [Тарифы ЮKassa](https://yookassa.ru/docs/support/payments/fees)
- **Автоплатежи:** подключение бесплатное, комиссия «от 2,8%» только с успешных платежей. До старта нужна **оферта с условиями подключения и отключения автоплатежа** — [ЮKassa: регулярные платежи](https://yookassa.ru/regulyarnye-platezhi/)
- Автоплатежи в рабочем магазине включает **менеджер ЮKassa по запросу** (в тестовом магазине они включены по умолчанию). В первом платеже передаётся `save_payment_method: true`, затем сохраняется `payment_method.id`. Сохранение бывает **безусловным** (по умолчанию; для карт, ЮMoney, **СБП**, SberPay и др.) и **условным** (на выбор покупателя; только для карт и кошелька ЮMoney) — [ЮKassa API: сохранение способа оплаты для автоплатежей](https://yookassa.ru/developers/payment-acceptance/integration-scenarios/widget/additional-settings/recurring-payments)
- Повторные списания идут по `payment_method_id` без участия покупателя; карту можно привязать на нулевую сумму — [ЮKassa: универсальный токен](https://yookassa.ru/developers/payouts/scenario-extensions/multipurpose-token)
- **Уведомлять клиента о предстоящем списании обязан сам магазин** — [Автоплатежи в ЮKassa](https://yookassa.ru/docs/support/payments/extra/autopayment)
- В справке ЮKassa есть отдельный вопрос «Подходит ли ЮKassa бизнесу, который продаёт по подписке?» (текст не получен) — [ЮKassa Q&A q222](https://yookassa.ru/questions/q222/)
- Анекдотично, сторонние агрегаторы: «комиссия от 0,4% + НДС, только за успешные платежи» (скорее всего, про СБП; источник не первичный) — [toolfox.ru: ЮKassa](https://toolfox.ru/services/s/yookassa); [cleverence.ru: ЮKassa для ИП и самозанятых](https://www.cleverence.ru/articles/elektronnaya-kommertsiya/-yukassa-dlya-ip-i-samozanyatyh-podklyuchenie/). Обзор Timeweb 2026 для онлайн-образования повторяет «Базовый тариф (оборот до 3 млн ₽/мес): карты 3,5%» — [Timeweb Community, 2026](https://timeweb.com/ru/community/articles/platyozhnye-sistemy-dlya-obrazovaniya-v-2026-sravnenie-i-podvodnye-kamni)

**CloudPayments**
- Конкретных ставок найти не удалось. По материалам CloudPayments, комиссия за транзакцию зависит от оборота и MCC; кроме основных сборов возможны доплаты (возвраты, операции в валюте); плата за подключение взимается один раз при подтверждении расчётного счёта (блог описывает рынок в целом, не только CloudPayments) — [CloudPayments: что входит в стоимость эквайринга](https://cloudpayments.ru/blog/chto-vkhodit-v-stoimost-internet-ekvayringa/)
- Сервис подписок: автосписания, уведомления, **чеки по 54-ФЗ**, управление подписками; сумма, периодичность и число списаний настраиваются. Тарифов на странице нет — [CloudPayments: сервис подписок для бизнеса](https://cloudpayments.ru/payments/subscriptions/); [CloudPayments: регулярные платежи](https://cloudpayments.ru/features/recurrent)
- Технически рекуррент создаётся после первой оплаты или авторизации на 1 ₽, которая выдаёт токен карты; по токену затем идёт план подписки — [Документация CloudPayments](https://developers.cloudpayments.ru/)

**Т-Касса (Т-Банк)**
- Интернет-эквайринг: абонентская плата 0 ₽, комиссия «от 0,4%», ставка индивидуальная. Упоминается акция «интернет-эквайринг за 0,99% навсегда», её условия в сводке не раскрыты — [Т-Банк: интернет-эквайринг](https://tbank.ru/kassa/form/partner/samo); [Т-Банк: эквайринг для бизнеса](https://www.tbank.ru/business/payments/)
- СБП (QR): 0,4% для видов деятельности из списка, 0,7% для остальных, 0,2% для ЖКХ; точная ставка видна в ЛК во вкладке «Тарифы» — [Т-Банк: условия платежей по QR через СБП](https://www.tbank.ru/business/help/business-payments/sbp/main/conditions/)
- T-Pay стоит как торговый эквайринг: отдельной пониженной ставки, как у СБП, нет — [Т-Банк: стоимость эквайринга](https://www.tbank.ru/business/help/business-payments/acquiring/about-and-tariffs/pay/)
- **НДС:** по сводке, «с 1 января 2026 года НДС 22% начисляется на комиссию за эквайринг». При этом страница онлайн-кассы для ИП пишет, что на приём через T-Pay и СБП НДС не начисляется — противоречие — [Т-Банк: стоимость эквайринга](https://www.tbank.ru/business/help/business-payments/acquiring/about-and-tariffs/pay/); [Т-Банк: онлайн-касса для ИП](https://www.tbank.ru/business/payments/online-cashbox/ip/)
- Карточная ставка интернет-эквайринга, условия рекуррента и цена облачной кассы: **не подтверждено**

**Robokassa**
- Для ИП и ООО по картам РФ ставка примерно **2,9–3,9%** в зависимости от месячного оборота, по **СБП — 1,8–2,7%**. Платят только за успешные платежи; на сайте сказано, что НДС на комиссию не начисляется — [Robokassa: тарифы для ИП, ООО и самозанятых](https://robokassa.com/payments/tarify/)
- На стартовом тарифе для сайтов карты стоят **3,9%** — [Robokassa: приём платежей на сайте](https://robokassa.com/solutions/website/)
- **Подписки/рекуррент:** подключение бесплатное, абонентской платы нет, чеки уходят автоматически, процент зависит от оборота — [Robokassa: платежи по подписке](https://robokassa.com/solutions/industry/platezhi-po-podpiske/)
- Оферта в редакции 26.0 (действует **с 05.02.2026**) ввела термины «рекуррентные» и «рекарринговые» платежи и условия их применения — [Robokassa: редакция договора 26.0](https://robokassa.com/blog/news/obnovlenie-dogovora-ob-okazanii-uslug-novaya-redaktsiya-26-0/). В той же сводке упомянута новая редакция договора ROBOKASSA ONLINE с 01.10.2026, которая меняет раздел «Тарифы»; какие именно цифры изменились — **не подтверждено**
- **Робочеки (54-ФЗ):** по договору (приложения 3 и 4) — **0,05% от суммы оплаты**, по которой выдан чек; при позднем подключении — 0,5%; чек коррекции — 0,10 ₽. Дата этой редакции договора неизвестна. На сайте же сказано, что отправка чеков для большинства решений входит в тариф, так что источники расходятся — [Договор Robokassa (PDF)](https://docs.robokassa.ru/media/1285/dogovor_robokassa.pdf); [Robokassa: блог «Эквайринг»](https://robokassa.com/blog/news/ekvayring-0/)
- Подключить Robokassa могут самозанятые, ИП и ООО; для самозанятых есть отдельное решение с автоматическими чеками — [Robokassa: тарифы](https://robokassa.com/payments/tarify/); [Robokassa для самозанятых](https://robokassa.com/solutions/business/samozanyatye/)

**Prodamus**
- Полный тариф стоит **10 000 ₽** и включает рекуррентные платежи. Для самозанятых есть тариф за 0 ₽, но **рекуррент в него не входит** — [Prodamus: тарифы](https://prodamus.ru/rates); [Prodamus: FAQ «Старт для самозанятых»](https://prodamus.ru/faq_promo)
- Комиссия по картам РФ и СБП — **3,8%**, от 500 000 ₽ оборота — 3,5%, от 4 000 000 ₽ — 2,9% — [Prodamus: тарифы](https://prodamus.ru/rates). На другой странице шкала другая: «изначально 3,5%», от 500 000 ₽ — 3,2%, от 1 000 000 ₽ — 2,9%. Это противоречие: возможно, разные продукты или устаревшие данные — [Prodamus: модуль для ИП](https://prodamus.ru/priem-platezhej-dlya-individualnogo-predprinimatelya)
- **Рекуррент, вариант 1, «Клубная система»:** подключение 1 000 ₽ при заключении договора (2 000 ₽, если позже), **+1% к тарифу начиная со 2-го платежа** — [Prodamus Help: клубная система](https://help.prodamus.ru/payform/rekurrent-i-kluby/kak-podklyuchit-rekurrentnye-platezhi-cherez-klubnuyu-sistemu-prodamus)
- **Вариант 2, «Робот автосписаний»:** подключение бесплатное, по сводке без наценки к комиссии. **Вариант 3:** собственная интеграция, где логику списаний задаёт продавец — [Prodamus: рекуррентные платежи](https://prodamus.ru/priem-rekurrentnyh-platezhej); [Prodamus блог: подписки в 2026](https://prodamus.ru/blog/chto-prodavat-po-podpiske-formaty-i-idei-dlya-biznesa)
- Интеграция сторонней онлайн-кассы — 990 ₽/мес, бесплатно при обороте от 200 000 ₽/мес. Акция «Тёплый октябрь» (3% для подключившихся 7–27.10.2026, ставка действует до 31.12.2026) уже закончилась — [Prodamus: модуль для ИП](https://prodamus.ru/priem-platezhej-dlya-individualnogo-predprinimatelya)

**Регулятор**
- Банк России 27.03.2026 утвердил решение о собственных тарифах в СБП (это тарифы ЦБ для его клиентов, а не ставки агрегаторов для мерчантов) — [1С:ИТС](https://its.1c.ru/db/content/newscomm/src/499236.htm)

### Inferences
- **Сводная таблица (Россия).** Значения — из поисковых сводок; «н/п» — не подтверждено.

| Провайдер | Карты (Мир и др.) | СБП | SberPay / T-Pay | Абон. плата | Рекуррент | Самозанятый / ИП / ООО | 54-ФЗ чеки |
|---|---|---|---|---|---|---|---|
| ЮKassa | 3,5% до 3 млн ₽/мес, «от 2,8%» при большем обороте | противоречиво (0% промо / индивидуально) | SberPay 3,5%; T-Pay н/п | 0 ₽ | да, включает менеджер; нужна оферта; сохранение СБП возможно | да / да / да | «Чеки от ЮKassa»: цена н/п |
| CloudPayments | н/п (зависит от оборота и MCC) | н/п | н/п | н/п | да (токен после 1 ₽-авторизации; сервис подписок) | н/п | чеки в сервисе подписок, цена CloudKassir н/п |
| Т-Касса | «от 0,4%», индивидуально; акция 0,99% (условия н/п) | 0,4% / 0,7% (QR-СБП) | T-Pay = как эквайринг | 0 ₽ | н/п | самозанятые — есть форма; ИП/ООО — да | н/п |
| Robokassa | 2,9–3,9% (старт 3,9%) | 1,8–2,7% | н/п | 0 ₽ | да, без доплаты за подключение | да / да / да | Робочеки 0,05% или «в тарифе» — расходится |
| Prodamus | 3,8% → 3,5% → 2,9% (шкалы расходятся) | 3,8% (вместе с картами) | н/п | тариф 10 000 ₽ разово | да: клуб +1% со 2-го платежа или робот без наценки | самозанятые (0 ₽, без рекуррента) / ИП / н/п | сторонняя касса 990 ₽/мес |

- Почему ЮKassa лучше подходит под модель «экран × месяц»: открытая ставка 3,5%, нет абонентской платы, сохранение СБП для автосписаний (это важно, если клиент не хочет давать карту) и готовые требования к оферте. Минус: на маленьком обороте ставка заметно выше, чем у Т-Кассы по СБП (0,4–0,7%), если только СБП-рекуррент у Т-Кассы реально доступен (н/п).
- Prodamus дорогой для малого B2B SaaS: разовые 10 000 ₽ плюс 3,8% и +1% за клубную рекурренту дают ~4,8% с повторных платежей. Prodamus ориентирован на инфобизнес и онлайн-школы.
- **Вариант «счёт + акт» по безналу для B2B.** Клиенты — ИП и ООО, поэтому выставлять ежемесячный (или квартальный/годовой) счёт и закрывать его актом выглядит естественно: эквайринга нет, а значит нет и комиссии 3–4%. По знаниям модели (**не подтверждено в этой сессии**): расчёты между организациями и ИП безналом без предъявления карты не требуют кассового чека по 54-ФЗ, а оплата корпоративной картой требует. Это нужно проверить по тексту 54-ФЗ и разъяснениям ФНС до того, как писать в отчёт.
- НДС на комиссию эквайринга с 2026 года: сводка по Т-Банку говорит о 22%, ЮKassa — «НДС только на сумму комиссии», Robokassa — «НДС на комиссию не начисляется». Для ИП на УСН без права вычета НДС на комиссию — прямой расход. В расчётах ниже даю оба варианта.

### Gaps
- Не удалось получить (лимит поиска и блокировка WebFetch): ставки CloudPayments и цену CloudKassir; карточную ставку Т-Кассы, условия рекуррента, требование счёта в Т-Банке и цену облачной кассы; цену «Чеков от ЮKassa»; сроки выплат (T+1 и т. п.) у всех провайдеров; список документов для подключения и требования к сайту (оферта, контакты, цены, реквизиты). Последнее подтверждено только у ЮKassa, и только для оферты по автоплатежам.
- **«Подписки СБП» (привязка счёта) для мерчантов в 2026 году:** подтверждение есть только у ЮKassa — в API сохранение способа оплаты «СБП» указано среди безусловных. У НСПК, Т-Кассы, CloudPayments, Robokassa и Prodamus статус **не подтверждён**.
- Опциональные провайдеры (Точка, Сбер эквайринг, PayKeeper, Модульбанк): данные не собраны, поиск исчерпан.
- Сервисы и банки для автоматических ежемесячных счетов (Контур.Эльба, «Моё дело», автосчета в Точке или Т-Бизнесе): данные не собраны. Существование и цены этих функций **не подтверждены**.
- Практический опыт с vc.ru (анекдотично) не собран.
- Требование 54-ФЗ для оплат от юрлиц/ИП по счёту и картой — нужен первичный источник (54-ФЗ, ФНС).

## 2. ЕС: Stripe, Paddle, Lemon Squeezy, Stripe Managed Payments, FastSpring, Mollie, Chargebee/Recurly

### Takeaway
Если есть юрлицо в стране, где работает Stripe, самый дешёвый вариант — **Stripe Payments + Stripe Billing**: карты EEA 1,5% + €0,25, Billing 0,7%, Stripe Tax 0,5% по желанию. VAT и OSS тогда остаются на продавце. **Merchant of record** (Paddle 5% + 50¢; Stripe Managed Payments 3,5% поверх обычных комиссий; Lemon Squeezy 5% + 50¢ с надбавками) снимает с продавца налоговую нагрузку, но стоит в 2–3 раза дороже. **Российское юрлицо и российские покупатели заблокированы** как минимум у Paddle (подтверждено); у Mollie нужна сущность в EEA, UK или CH.

### Cited Findings

**Stripe (EU account)**
- Стандартные карты EEA — **1,5% + €0,25**; UK-карты — **2,5% + €0,25**; международные (не EEA) — **3,15% + €0,25**; при конвертации валюты +2% — [Stripe Pricing (NL)](https://stripe.com/en-nl/pricing) (сводка предупреждает, что страница в индексе может быть старой; по знаниям модели международные карты — 3,25% + €0,25, **не подтверждено**). Премиальные карты EEA: **не подтверждено**
- **Stripe Billing:** pay-as-you-go **0,7% от объёма биллинга**; применяется к транзакциям на Stripe и вне его, разовые инвойсы не входят. Stripe заменил тарифы Starter и Scale единым планом 0,70%; есть альтернатива — помесячная подписка на Billing — [Stripe Billing pricing](https://stripe.com/billing/pricing); [Stripe Support: изменения Billing Starter/Scale](https://support.stripe.com/questions/changes-to-the-stripe-billing-starter-and-scale-plans)
- **Stripe Tax:** **0,5%** от объёма (no-code-интеграция) только в юрисдикциях, где продавец зарегистрирован для сбора налога. Подписка Tax Complete — от **$90/мес** за 200 транзакций, сверх — $0,50 за транзакцию — [Stripe Support: Stripe Tax pricing](https://support.stripe.com/questions/understanding-stripe-tax-pricing)
- **Stripe Invoicing:** Starter — **0,4%** за оплаченный инвойс, Plus — **0,5%**; фиксированных платежей нет, плюс обычные комиссии Payments — [Stripe Support: Invoicing pricing](https://support.stripe.com/questions/stripe-invoicing-pricing); [Stripe Invoicing pricing](https://stripe.com/invoicing/pricing)
- **SEPA Direct Debit:** нашлась только **US-ориентированная** цифра — 0,8% + 30¢ с потолком $6,00 плюс сборы за международные операции и конвертацию — [Stripe: local payment methods pricing](https://stripe.com/pricing/local-payment-methods). С июня 2024 года неуспешные платежи и диспуты по SEPA DD тарифицируются отдельно (для US-аккаунтов $5 и $15); другой гайд Stripe называет $10 — противоречие — [Stripe Support: June 2024 SEPA DD update](https://support.stripe.com/questions/june-2024-pricing-update-for-sepa-direct-debit); [Stripe: SEPA DD guide](https://stripe.com/resources/more/sepa-direct-debit-an-in-depth-guide). Тариф SEPA DD для EU-аккаунта: **не подтверждено** (по знаниям модели — порядка €0,35 за транзакцию, проверить)
- Stripe Billing поддерживает подписки с оплатой через SEPA Direct Debit — [Stripe Docs: subscription with SEPA DD](https://docs.stripe.com/billing/subscriptions/sepa-debit)
- Список стран, где работает Stripe — [Stripe global availability](https://stripe.com/global) (содержимое не получено). Недоступность Stripe для российских компаний: **не подтверждено в этой сессии** (по знаниям модели России в списке нет)

**Stripe Managed Payments (MoR от Stripe)**
- Комиссия **3,5% за успешную транзакцию**, считается от полной суммы **с налогом**, **поверх обычных комиссий Stripe**; для подписок дополнительно взимается Billing — [Stripe Support: Managed Payments pricing](https://support.stripe.com/questions/managed-payments-pricing)
- Только **цифровые продукты** (SaaS, ПО, цифровые загрузки), только через Checkout и Payment Links — [Stripe Docs: Managed Payments](https://docs.stripe.com/payments/managed-payments); [Changelog 2026-04-22](https://docs.stripe.com/changelog/dahlia/2026-04-22/managed-payments)
- Требования: доступ даётся после **eligibility review** (тип бизнеса и география); бизнес должен **находиться в одной из поддерживаемых стран**; только прямые интеграции (Connect и Express не подходят); каждому продукту нужен подходящий tax code; продукт полностью автоматизирован (услуги с участием человека, например 1-на-1 коучинг, не подходят); нужен низкий уровень диспутов. Покупатели — из 195+ стран, кроме списка ограниченных — [Stripe Docs: Managed Payments eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)
- Changelog от **22.04.2026**: GA для бизнесов из **39 стран**, добавлена Австралия — [Stripe Docs changelog](https://docs.stripe.com/changelog/dahlia/2026-04-22/managed-payments). Сам список стран не получен
- Косвенный налог (VAT, GST, sales tax) Stripe берёт на себя в 75–80+ странах (источники называют разные числа). Исключения: B2B внутри Сингапура и любые внутренние продажи в Японии не покрываются; Сербия — только cross-border — [Stripe Docs: Managed Payments tax compliance](https://docs.stripe.com/payments/managed-payments/tax-compliance)

**Lemon Squeezy**
- **5% + 50¢** за транзакцию, плюс надбавки: **+1,5%** за международные транзакции (вне США), **+1,5%** за PayPal, **+0,5%** за платежи по подписке — [Lemon Squeezy Docs: Fees](https://docs.lemonsqueezy.com/help/getting-started/fees); [Lemon Squeezy Pricing](https://www.lemonsqueezy.com/pricing)
- Выплаты: 0% на банковские счета в США, **1% на счета вне США** — [Lemon Squeezy blog: payout fees sliced](https://www.lemonsqueezy.com/blog/payout-fees-sliced)
- Для мигрирующих: 0% комиссии первые 30 дней на продажи до $10 000, миграция вручную — [Lemon Squeezy: Migration offer](https://www.lemonsqueezy.com/migration-offer)
- **Связь со Stripe:** в инвойсах за комиссии Stripe Managed Payments до 06.04.2026 юрлицом могло стоять «LemonSqueezy LLC», после — «Sold through Link, LLC»; Stripe называет оба одним и тем же MoR-сервисом в составе Managed Payments — [Stripe Support: legal entity on Managed Payments invoices](https://support.stripe.com/questions/why-is-lemonsqueezy-the-legal-entity-on-my-invoice-for-stripe-managed-payments-fees)
- Анекдотично, сторонние обзоры 2026: Lemon Squeezy в 2026 году всё ещё продаёт как MoR, а Stripe предлагает его пользователям путь миграции; эффективная ставка после миграции не раскрыта — [Paritydeals: Lemon Squeezy fee calculator](https://www.paritydeals.com/lemon-squeezy-fee-calculator/); [Creem: Lemon Squeezy 2026](https://www.creem.io/blog/lemon-squeezy); [Dodo Payments: Lemon Squeezy review 2026](https://dodopayments.com/blogs/lemonsqueezy-review)

**Paddle**
- **5% + 50¢** за транзакцию «всё включено»: платежи, налоги, фрод, чарджбэки, биллинг и управление подписками (это позиционирование самого Paddle) — [Paddle 101](https://www.paddle.com/paddle-101); [Paddle vs Stripe](https://www.paddle.com/compare/stripe)
- MSA: скидка Paddle Checkout — 5% от SRP + $0,50. Paddle выплачивает продавцу цену продажи минус sales tax, эту скидку и прочие сборы; Paddle сам собирает, декларирует и перечисляет sales tax. Платная надстройка Checkout Recovery — 10% от каждого восстановленного checkout — [Paddle Master Services Agreement](https://www.paddle.com/legal/terms)
- **Россия:** Paddle работает с софтверными бизнесами по всему миру, кроме неподдерживаемых стран, среди которых **Россия, Беларусь, Крым, Донецк, Херсон, Луганск, Запорожье**. Бизнесы оттуда **не могут зарегистрироваться**; выплаты на российский счёт, «скорее всего, невозможны» (баланс удерживается); **транзакции от российских покупателей запрещены**, подписки покупателей из РФ и РБ отменены в апреле 2023 — [Paddle Help: impact of sanctions on Russia and Belarus](https://www.paddle.com/help/legal/sanctions/impact-of-sanctions-on-russia-and-belarus); [Paddle Help: supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle); [Paddle Dev: supported countries](https://developer.paddle.com/concepts/sell/supported-countries-locales.md)
- Юрлицо в ЕС Paddle **не требует**: «works with software businesses anywhere in the world» за исключением списка выше — [Paddle Help: supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)

**Mollie**
- Карты Mastercard/Visa: **потребительские EEA — 1,80% + €0,25**, **коммерческие EEA — 2,90% + €0,25**, **не EEA — 3,25% + €0,25** — [Mollie: credit card](https://www.mollie.com/payments/credit-card). На главной странице тарифов есть pay-as-you-go с внутренними потребительскими картами по 1,20% и план Pro для объёмов от €1 900/мес — с карточной страницей это расходится — [Mollie Pricing](https://www.mollie.com/pricing)
- **SEPA Direct Debit — €0,35** — [Mollie Pricing](https://www.mollie.com/pricing); [Mollie: Direct Debit](https://www.mollie.com/payments/direct-debit). Старые страницы называют €0,25 + 0,9% — [Mollie Magento SEPA](https://www.mollie.com/integrations/magento/sepa)
- Поддерживаемые места регистрации мерчанта: **EEA, Великобритания, Швейцария**; SEPA DD — стандартный способ регулярных платежей в евро — [Mollie Docs: SEPA Direct Debit](https://docs.mollie.com/docs/sepa-direct-debit)

**FastSpring**
- Публичной ставки нет: фиксированный тариф по типу и объёму транзакций, все функции включены, без минимального объёма; FastSpring — seller of record (риски, чарджбэки, глобальный VAT), без cross-border-сборов — [FastSpring Pricing](https://fastspring.com/pricing/); [FastSpring: Merchant of Record](https://fastspring.com/merchant-of-record/)
- По данным конкурента (Paddle), FastSpring берёт 2,5% за конвертацию при выплатах не в USD — [Paddle: FastSpring vs Stripe](https://www.paddle.com/alternatives/fastspring-vs-stripe) (непервичный, заинтересованный источник)

**Chargebee / Recurly (billing layer, не MoR)**
- Chargebee: **бесплатно до первых $250K накопленного биллинга**, дальше **0,75%** от биллинга — [Chargebee Pricing](https://www.chargebee.com/pricing/). Программа для стартапов: бесплатно до $1M накопленной выручки, но только для стартапов из VC- или акселераторных сетей, привлёкших меньше $5M — [Chargebee for Startups](https://www.chargebee.com/startups/)
- Recurly Starter: **$249/мес + 0,9%** от объёма, первые $40K биллинга в месяц включены; бесплатного тарифа нет, только 90-дневный триал — [Recurly Pricing](https://recurly.com/pricing/)

### Inferences
- **Сводная таблица (ЕС).**

| Провайдер | Базовая ставка | Подписки | Налоги | MoR | Юрлицо / страны | Россия |
|---|---|---|---|---|---|---|
| Stripe + Billing | EEA 1,5% + €0,25; UK 2,5% + €0,25; intl 3,15% + €0,25 (+2% FX) | +0,7% Billing | Stripe Tax +0,5% (опц.) | нет | юрлицо в стране Stripe (список н/п) | н/п (вероятно, нет) |
| Stripe Managed Payments | 3,5% + обычные комиссии Stripe | + Billing | включено (75–80+ стран) | да | 39 стран на 22.04.2026 (список н/п) | н/п |
| Paddle | 5% + 50¢ всё включено | включено | включено | да | любая страна, кроме unsupported | **запрещено** (продавцы и покупатели) |
| Lemon Squeezy | 5% + 50¢ | +0,5% подписки; +1,5% вне США; +1,5% PayPal | включено | да (теперь в связке со Stripe MP) | н/п | н/п |
| FastSpring | индивидуально | включено | включено | да | н/п | н/п |
| Mollie | EEA 1,8% + €0,25 (коммерч. 2,9% + €0,25); SEPA DD €0,35 | н/п | нет | нет | **только EEA, UK, CH** | нет (нужна EU-сущность) |
| Chargebee | 0% до $250K, далее 0,75% | — | — | нет | зависит от шлюза | — |
| Recurly | $249/мес + 0,9% (свыше $40K/мес) | — | — | нет | зависит от шлюза | — |

- Для B2B (кафе в ЕС с VAT ID) MoR даёт меньше, чем B2C-продукту: при reverse charge продавец, как правило, не начисляет VAT по межгосударственным B2B-продажам внутри ЕС. Налоговая выгода MoR тогда сводится к внутренним продажам и B2C-хвосту, а премия к Stripe остаётся +3–5 п. п. Это общий принцип НДС в ЕС, **не подтверждено источником в этой сессии**.
- Цифровое меню — это SaaS, то есть подходит под «digital products» у Stripe Managed Payments. **Если в подписку входит железо (ТВ-плеер, монтаж), её часть может не пройти eligibility** — нужно отделять.
- Платёжный аккаунт в ЕС для основателя из РФ почти наверняка потребует отдельного юрлица в ЕС (или другой поддерживаемой стране) и нероссийского резидентства или бенефициаров по правилам KYC и санкций провайдера. Прямой запрет подтверждён только у Paddle.

### Gaps
- **B2B-функции** (сбор VAT ID, инвойсы с reverse charge, оплата инвойса переводом, quantity/per-seat pricing, proration, dunning и Smart Retries, customer portal) ни у одного провайдера в этой сессии не подтверждены источниками. По знаниям модели (**не подтверждено**): у Stripe Billing есть quantity-подписки, proration, Smart Retries, Customer Portal, сбор tax ID в Checkout и reverse-charge-пометки при Stripe Tax; у Paddle и Chargebee есть похожие функции. Нужно проверить по docs.stripe.com, developer.paddle.com, chargebee.com/docs.
- Stripe: премиальные карты EEA, тариф SEPA DD для EU-аккаунтов, точная ставка международных карт (3,15% или 3,25%), прямой статус России.
- Stripe Managed Payments: список 39 стран продавцов и список ограниченных стран покупателей не получены. Совместимость MP с B2B-инвойсами и reverse charge — н/п.
- Paddle: варианты выплат (wire, Payoneer, PayPal?) и их стоимость, минимальная выплата — н/п.
- Lemon Squeezy: принимает ли он новых продавцов в 2026 году и в каких странах; первичного подтверждения покупки Stripe (2024) в этой сессии нет (есть только косвенное — страница Stripe Support про юрлицо).
- FastSpring: публичная ставка (по знаниям модели исторически 5,9% + $0,95) — **не подтверждено**.
- Mollie: стоимость Subscriptions API — н/п.

## 3. Расчёт на примере: кафе, 3 экрана, €20 (≈1 500–2 000 ₽) за экран в месяц

### Takeaway
За €60/мес (3 экрана одной подпиской) клиент обходится примерно в **€1,6 (2,6%)** у Stripe + Billing с картой EEA, **≈€3,4 (5,7%)** у Paddle, **≈€3,7 (6,1%)** у Stripe Managed Payments и **≈€4,6–5,2 (7,7–8,6%)** у Lemon Squeezy. В России за 4 500–6 000 ₽/мес — **157–210 ₽ (3,5%)** у ЮKassa без НДС на комиссию или **192–256 ₽ (4,27%)** с НДС 22%; **175–234 ₽ (3,9%)** у Robokassa на стартовой ставке; **216–288 ₽ (4,8%)** у Prodamus с клубной рекуррентой. Подпиской с quantity = 3 выгоднее, чем тремя отдельными: фиксированная часть комиссии платится один раз.

### Cited Findings
- Ставки, использованные в расчёте: Stripe EEA 1,5% + €0,25, UK 2,5% + €0,25, intl 3,15% + €0,25 — [Stripe Pricing (NL)](https://stripe.com/en-nl/pricing); Billing 0,7% — [Stripe Billing pricing](https://stripe.com/billing/pricing); Tax 0,5% — [Stripe Support: Tax pricing](https://support.stripe.com/questions/understanding-stripe-tax-pricing); Managed Payments 3,5% поверх обычных комиссий плюс Billing — [Stripe Support: MP pricing](https://support.stripe.com/questions/managed-payments-pricing); Paddle 5% + $0,50 — [Paddle MSA](https://www.paddle.com/legal/terms); Lemon Squeezy 5% + 50¢, +0,5% подписка, +1,5% вне США — [LS Docs: Fees](https://docs.lemonsqueezy.com/help/getting-started/fees), выплата вне США 1% — [LS blog](https://www.lemonsqueezy.com/blog/payout-fees-sliced); Mollie EEA 1,80% + €0,25, коммерч. 2,90% + €0,25, SEPA DD €0,35 — [Mollie card](https://www.mollie.com/payments/credit-card), [Mollie Pricing](https://www.mollie.com/pricing); Chargebee 0% до $250K — [Chargebee Pricing](https://www.chargebee.com/pricing/)
- ЮKassa 3,5% до 3 млн ₽/мес, НДС на сумму комиссии — [Тарифы ЮKassa](https://yookassa.ru/docs/support/payments/fees); НДС 22% на комиссию эквайринга с 01.01.2026 (по сводке страницы Т-Банка) — [Т-Банк: стоимость эквайринга](https://www.tbank.ru/business/help/business-payments/acquiring/about-and-tariffs/pay/); Robokassa карты 2,9–3,9%, СБП 1,8–2,7%, Робочеки 0,05% — [Robokassa тарифы](https://robokassa.com/payments/tarify/), [Договор Robokassa](https://docs.robokassa.ru/media/1285/dogovor_robokassa.pdf); Prodamus 3,8% + 1% (клуб, со 2-го платежа), тариф 10 000 ₽ — [Prodamus rates](https://prodamus.ru/rates), [Prodamus Help: клуб](https://help.prodamus.ru/payform/rekurrent-i-kluby/kak-podklyuchit-rekurrentnye-platezhi-cherez-klubnuyu-sistemu-prodamus); Т-Касса СБП 0,4–0,7% — [Т-Банк СБП](https://www.tbank.ru/business/help/business-payments/sbp/main/conditions/)

### Inferences
**Допущения:** одно списание €60 в месяц (подписка, quantity = 3); B2B с reverse charge, то есть VAT в сумме нет (при B2C с VAT база у MoR вырастет, так как комиссия берётся с суммы с налогом); **$0,50 ≈ €0,43 при допущенном курсе 1 EUR = 1,16 USD (курс не из источника)**; FX-конвертации нет, если не сказано иное.

**ЕС, €60/мес**

| Сценарий | Расчёт | Комиссия, € | % |
|---|---|---|---|
| Stripe, карта EEA + Billing | 0,90 + 0,25 + 0,42 | **1,57** | 2,6% |
| то же + Stripe Tax 0,5% | + 0,30 | 1,87 | 3,1% |
| Stripe, UK-карта + Billing | 1,50 + 0,25 + 0,42 | 2,17 | 3,6% |
| Stripe, intl-карта + Billing (3,15%) | 1,89 + 0,25 + 0,42 | 2,56 | 4,3% (с FX +2% → 3,76 € / 6,3%) |
| Stripe Payments + Chargebee (free tier) вместо Billing | 0,90 + 0,25 | 1,15 | 1,9% |
| Stripe SEPA DD + Billing | тариф EU **н/п**; при допущении €0,35: 0,35 + 0,42 | ≈0,77 | ≈1,3% |
| Stripe Managed Payments (EEA-карта) | 2,10 + 1,15 + 0,42 | **3,67** | 6,1% |
| Paddle | 3,00 + ≈0,43 | **≈3,43** | ≈5,7% |
| Lemon Squeezy (покупатель вне США, карта) | 5% + 0,5% + 1,5% = 4,20 + ≈0,43 | ≈4,63 | ≈7,7% |
| то же + 1% за выплату на счёт вне США | + ≈0,55 | ≈5,18 | ≈8,6% |
| Mollie, потребительская карта EEA | 1,08 + 0,25 | 1,33 | 2,2% (без биллинг-слоя) |
| Mollie, коммерческая карта EEA | 1,74 + 0,25 | 1,99 | 3,3% |
| Mollie SEPA DD | 0,35 | 0,35 | 0,6% |

- **Эффект фиксированной части:** если выставлять каждый экран отдельной подпиской (3 × €20), Stripe EEA + Billing стоит 3 × (0,30 + 0,25 + 0,14) = €2,07 (3,45%) вместо €1,57; Paddle — 3 × (1,00 + 0,43) ≈ €4,29 (7,2%) вместо €3,43; Lemon Squeezy — ≈€5,49 (9,2%) без учёта выплат. **Вывод: одна подписка на кафе с quantity = число экранов.**
- **Годовая оплата** (€720 одним платежом): Stripe EEA + Billing ≈ 10,80 + 0,25 + 5,04 = €16,09 (2,2%); Paddle ≈ 36,00 + 0,43 = €36,43 (5,1%).

**Россия, 3 экрана: 4 500 ₽ (по 1 500 ₽) и 6 000 ₽ (по 2 000 ₽) в месяц**

| Сценарий | 4 500 ₽ | 6 000 ₽ | % |
|---|---|---|---|
| ЮKassa, карта/SberPay, Базовый (без НДС на комиссию) | 157,50 ₽ | 210,00 ₽ | 3,5% |
| ЮKassa + НДС 22% на комиссию | 192,15 ₽ | 256,20 ₽ | 4,27% |
| Robokassa, карта, стартовая 3,9% | 175,50 ₽ | 234,00 ₽ | 3,9% |
| Robokassa, карта, 2,9% (высокий оборот) | 130,50 ₽ | 174,00 ₽ | 2,9% |
| Robokassa, СБП 1,8–2,7% (если доступен рекуррент по СБП — н/п) | 81–121,50 ₽ | 108–162 ₽ | 1,8–2,7% |
| + Робочеки 0,05% (если не входят в тариф) | +2,25 ₽ | +3,00 ₽ | +0,05% |
| Prodamus, клубная рекуррента (3,8% + 1% со 2-го платежа) | 216,00 ₽ | 288,00 ₽ | 4,8% |
| Prodamus, «робот» без наценки | 171,00 ₽ | 228,00 ₽ | 3,8% |
| Т-Касса, СБП 0,4–0,7% (рекуррент по СБП — н/п) | 18–31,50 ₽ | 24–42 ₽ | 0,4–0,7% |
| CloudPayments | н/п | н/п | н/п |
| Счёт + акт (безнал от ИП/ООО) | 0 ₽ эквайринга; цена входящих платежей по РКО — н/п | | |

- Prodamus добавляет разовые 10 000 ₽ за тариф. Для одного кафе это ≈833 ₽/мес в первый год; на 50 кафе — копейки на экран.
- Лимиты ЮKassa (700 000 ₽ за платёж) не мешают даже годовой оплате за одно кафе (54 000–72 000 ₽/год) — [ЮKassa: SberPay](https://yookassa.ru/sberpay/)
- Разница между лучшим EU-вариантом (Stripe, ~2,6%) и лучшим подтверждённым российским (ЮKassa, 3,5–4,27%) — около 1–1,7 п. п. Модель «счёт + акт» для российских B2B-клиентов убирает эту статью полностью, но требует ручной или полуавтоматической работы с дебиторкой (инструменты автовыставления счетов — н/п).

### Gaps
- Курс EUR/USD и EUR/RUB на 30.10.2026 не получен из источника. Перевод €20 ≈ 1 500–2 000 ₽ взят из задания, сумма $0,50 в евро посчитана по допущенному курсу.
- Как трактовать НДС на комиссию у каждого российского провайдера в 2026 году, не до конца ясно (противоречия ЮKassa / Т-Банк / Robokassa).
- Реальные ставки Т-Кассы и CloudPayments для небольшого B2B SaaS, а также тариф SEPA DD у Stripe для EU-аккаунта в расчёт не попали: в сессии они не подтверждены.
