# Нишевые, EU-native и menu-board-ориентированные конкуренты digital signage + POS-интеграции в ЕС (состояние на 30.10.2026)

> **Как собраны данные (важно для автора отчёта).** В этой сессии WebFetch и curl не могли открыть сайты вендоров, G2/Capterra/Trustpilot и порталы разработчиков POS: kitcast.tv, fugo.ai, viewneo.com, xibosignage.com, capterra.com, g2.com, trustpilot.com, developers.lightspeedhq.com, developer.sumup.com, developer.squareup.com, developer.zettle.com, pickcel.com и screenly.io отвечали `ENOTFOUND` или `403 connect_rejected` от egress-прокси. Поэтому цены и функции ниже взяты из **сниппетов и сводок WebSearch** (URL указаны, сами страницы целиком не открывались) и из **первичных файлов на GitHub**, которые удалось скачать: OpenAPI Square, OpenAPI SumUp, документация Zettle, README Xibo и Anthias. После 24 поисковых запросов исчерпался общий лимит WebSearch на ход (200 запросов на всех агентов). Из-за этого **не проверены**: orderbird, Toast UK/IE, Gastrofix, SumUp POS Pro (Goodtill/Tiller), рейтинги на G2/Capterra/Trustpilot, способы оплаты подписки и галереи шаблонов. Всё, что взято из памяти модели, помечено «не подтверждено / not confirmed».

## Вопрос 1. Какие нишевые игроки сильнее всего именно в menu boards и сколько они берут? (с карточками конкурентов)

### Takeaway
Для небольших заведений рыночная цена цифрового меню — **$5–24 за экран в месяц** (Juuno, Kitcast, Yodeck, PDS, Pickcel, Fugo). Дешевле только Xibo: £3.50–9 за дисплей. Дороже стоят enterprise-платформы: Signagelive (~$270 за устройство в год, годовой контракт) и Menuboard Manager ($89–299). **Почти все публикуют цены в USD.** В EUR цены показывают только европейские игроки: mirabyte FrontFace (Германия, €599.95 разовая лицензия или €39.95/мес), KPN (Нидерланды, €11.50 за ТВ в бандле с интернетом), Signagelive (≈€230 в год), реселлеры Xibo (€1.50). Чисто «меню-бордовые» SaaS для одиночного кафе (Mandoe, Live Digital Menus, Menuboard Manager, Juuno) либо не из ЕС, либо не публикуют прозрачных цен.

### Cited Findings

#### Сводная таблица цен (за экран в месяц, если не указано иное)
| Продукт | HQ | Помесячная оплата | Годовая оплата | Бесплатно / триал | Источник |
|---|---|---|---|---|---|
| Kitcast | не подтверждено (США?) | Starter $7, Pro $10 (за экран; при годовой оплате дешевле) | ниже месячной, сумма не подтверждена | триал 14 дней без карты | [kitcast.tv/yodeck-alternative](https://kitcast.tv/yodeck-alternative), [kitcast.tv/blog/digital-signage-costs](https://kitcast.tv/blog/digital-signage-costs) |
| Fugo | не подтверждено | Essential $24, Core $36 | Essential $20, Core $30, Enterprise $40 ($480 за экран в год, только годовая) | триал 14 дней, 1 бесплатный тестовый экран с водяным знаком | [fugo.ai/pricing](https://fugo.ai/pricing/), [fugo.ai/company/faq](https://www.fugo.ai/company/faq/) |
| Xibo Cloud | Великобритания (Xibo Signage Ltd) | Professional ~£3.50, Business ~£5.50, Enterprise ~£9.00 (по данным агрегаторов) | есть и помесячная, и годовая оплата | у голландского реселлера триал 14 дней на 2 экрана | [capterra.com/p/182202/Xibo/pricing](https://www.capterra.com/p/182202/Xibo/pricing/), [xibo.org.uk/shop](https://www.xibo.org.uk/shop) |
| viewneo | Германия (не подтверждено) | не подтверждено | Enterprise доступен только с помесячной оплатой | триал 30 дней со всеми функциями | [viewneo.com/pricing](https://viewneo.com/pricing), [docs.viewneo.com/en/getting-started/plans-and-subscriptions](https://docs.viewneo.com/en/getting-started/plans-and-subscriptions/) |
| Pickcel | Индия (не подтверждено) | Professional $15 | Professional $13.50 | триал 14 дней с функциями Professional | [pickcel.com/pricing.html (internal)](https://website.internal.pickcel.com/pricing.html), [support.pickcel.com](https://support.pickcel.com/portal/en/kb/articles/what-are-the-different-types-of-pricing-plans) |
| Play Digital Signage (PDS) | не подтверждено | $18 | $12 (на главной «от $8») | 1 экран бесплатно навсегда, если оставить отзыв в течение 30 дней | [playsignage.com/pricing](https://www.playsignage.com/pricing), [playsignage.com](https://playsignage.com/) |
| Screenly | не подтверждено | $16.90 / Business $26.60 | $14.30 / Business $23.80 / Enterprise $37.50 | по ITQlick триала нет, по Capterra UK есть 14 дней (источники противоречат друг другу) | [itqlick.com/screenly/pricing](https://www.itqlick.com/screenly/pricing) (февраль 2026) |
| Signagelive | Великобритания (не подтверждено) | — | ~$270 за устройство в год (≈£200 / ≈€230), что равно ~$22.50 в месяц с годовым контрактом | по ITQlick триала нет | [signagelive.com/pricing](https://signagelive.com/pricing), [fugo.ai/blog/signagelive-pricing](https://www.fugo.ai/blog/signagelive-pricing/) |
| Mandoe | Австралия (не подтверждено) | не подтверждено | не подтверждено | на Capterra указаны «Free version» и «Free trial» | [capterra.ca/software/209373/mandoe](https://www.capterra.ca/software/209373/mandoe) |
| Juuno | США (Laguna Beach, CA) | от $5 за экран (на сайте), блог называет «около $20» | не подтверждено | триал на всех планах | [juuno.co/digital-signage-for/small-business-digital-signage](https://juuno.co/digital-signage-for/small-business-digital-signage), [digitalsignagetoday.com FAQ](https://www.digitalsignagetoday.com/companies/showcases/juuno/frequently-asked-questions/) |
| Yodeck | не подтверждено (вероятно, греческие основатели) | Basic $8, Premium $12, Enterprise $16 | не подтверждено | 1 экран бесплатно | [theretailexec.com/nl/…](https://theretailexec.com/nl/tools/beste-software-digitale-menuborden-restaurants/) (вторичный источник) |
| mirabyte FrontFace | Германия | SaaS €39.95/мес + 19% НДС | разовая бессрочная лицензия €599.95 + 19% НДС за устройство | бесплатная полнофункциональная пробная версия | [softguide.com/program/frontface](https://www.softguide.com/program/frontface), [mirabyte.com](https://www.mirabyte.com/en/frontface/use-cases/digital-menu-boards.html) |
| KPN Zakelijk TV (narrowcasting) | Нидерланды | от €11.50 за ТВ-экран, только вместе с KPN EEN MKB Internet | — | — | [kpn.com/zakelijk/televisie/narrowcasting](https://www.kpn.com/zakelijk/televisie/narrowcasting) |
| Menuboard Manager | США (не подтверждено) | Starter $89, Professional $199, Business $299 (по сводке «за экран», что выглядит завышенным; требует проверки) | — | — | [menuboardmanager.com/pricing](https://menuboardmanager.com/pricing) |
| NoviSign | не подтверждено | — | от $14 за экран (годовая оплата, сторонний обзор) | триал | [theretailexec.com/es/…](https://theretailexec.com/es/tools/mejor-software-carteleria-digital-restaurantes/) (вторичный источник) |

#### Kitcast
- Сайт: https://kitcast.tv. Starter стоит $7, Pro $10 за экран в месяц. В Pro добавлены SSO, SCIM и audit log, Enterprise — по запросу. Триал 14 дней без карты. Скидки есть для образования, НКО и при годовой оплате — [Kitcast blog](https://kitcast.tv/blog/digital-signage-costs), [Kitcast vs Yodeck (обновлено в августе 2026)](https://kitcast.tv/yodeck-alternative), [SoftwareAdvice](https://www.softwareadvice.com/digital-signage/kitcast-profile/).
- Kitcast в своих сравнениях указывает цены конкурентов: Yodeck $8, ScreenCloud $20, OptiSigns Standard $10 за экран в месяц. Это маркетинг вендора, цифры могут быть устаревшими — [kitcast.tv/screencloud-alternative](https://kitcast.tv/screencloud-alternative).
- У Kitcast есть `llms.txt` с описанием продукта — [kitcast.tv/llms.txt](https://kitcast.tv/llms.txt) (содержимое не открывалось).
- Отзывы: страницы есть на [Capterra UK](https://www.capterra.co.uk/reviews/180161/kitcast), [GetApp](https://www.getapp.com/marketing-software/a/kitcast/) и [Gartner](https://www.gartner.com/reviews/product/kitcast-868762881). **Рейтинг и число отзывов: не подтверждено.**
- HQ, устройства (Apple TV, Android TV, Fire TV, Tizen, webOS и т. д.), EUR-цены, способы оплаты: **не подтверждено**. По памяти модели, Kitcast исторически начинался как signage для Apple TV.

#### Fugo
- Сайт: https://fugo.ai. Essential: $20 за экран в месяц при годовой оплате, $24 при помесячной; включает встроенную design studio. Core: $30 / $36, добавляет интеграции и premium apps. Enterprise: $40 ($480 за экран в год, только годовая оплата), добавляет on-prem dashboards, local app casting и SSO. Годовая скидка 20%. Каждый экран требует отдельной лицензии, экраны можно добавлять и убирать в любой момент. Триал 14 дней и 1 бесплатный тестовый экран с водяным знаком. Есть скидки для образования и НКО — [fugo.ai/pricing](https://fugo.ai/pricing/), [fugo.ai FAQ](https://www.fugo.ai/company/faq/).
- Цифры на странице цен и в FAQ немного расходятся (Core $36 указан только в FAQ). Capterra и GetApp пишут «от $20» — [Capterra UK](https://www.capterra.co.uk/software/183172/digital-signage-cms), [GetApp reviews](https://www.getapp.com/marketing-software/a/fugo/reviews/).
- Итальянский обзор относит Fugo к облачным платформам для menu boards, ориентированным на мультиэкранные сети, то есть скорее на сети, чем на одиночное кафе — [theretailexec.com/it/…](https://theretailexec.com/it/tools/migliori-software-tabelloni-digitali-menu/).
- Устройства, HQ, рейтинги: **не подтверждено**.

#### Xibo (Великобритания)
- Xibo — open-source CMS под лицензией AGPL-3.0, Copyright 2006–2026 Xibo Signage Ltd. Плеер для Windows открытый. Плееры для Android, LG webOS и Samsung Tizen коммерческие. Xibo продаёт облачный хостинг CMS и поддержку, CMS можно поставить и у себя (Docker) — [GitHub xibosignage/xibo-cms README](https://github.com/xibosignage/xibo-cms).
- Облачные планы: Professional, Business и Enterprise с оплатой за дисплей помесячно или за год — [xibo.org.uk/shop](https://www.xibo.org.uk/shop). Агрегаторы называют ~£3.50, £5.50 и £9.00 в месяц — [Capterra](https://www.capterra.com/p/182202/Xibo/pricing/), [SoftwareAdvice](https://www.softwareadvice.com/digital-signage/xibo-profile). Голландский реселлер даёт триал 14 дней на 2 экрана, затем €1.50 за экран в месяц — [id.nl](https://id.nl/zekerheid-en-gemak/veilig-online/beveiligingssoftware/digital-signage-met-xibo-je-eigen-digitale-infobord). В 2019 году лицензия на один Android-дисплей стоила $18 в год ($1.50 в месяц), и для помесячной оплаты в облаке был минимум 10 слотов. **Эти данные устарели (2019)** — [blog.xibo.org.uk](https://blog.xibo.org.uk/subscription-pricing-is-here/).
- Шаблоны меню, простота для владельца кафе, рейтинги: **не подтверждено**. По памяти модели, Xibo считается мощным, но сложным для нетехнического пользователя.

#### viewneo (Германия)
- Сайт: https://viewneo.com. Триал 30 дней со всеми функциями. Одна лицензия покрывает одно устройство, её можно перенести на другой плеер. Enterprise доступен только с помесячной оплатой — [viewneo.com/pricing](https://viewneo.com/pricing), [docs.viewneo.com FAQ](https://docs.viewneo.com/en/faq/faq/), [Plans & Subscriptions](https://docs.viewneo.com/en/getting-started/plans-and-subscriptions/).
- Плееры: есть приложение для iOS — [App Store](https://apps.apple.com/app/id950284515) — и для Windows — [docs.viewneo.com Windows](https://docs.viewneo.com/en/software-player/viewneo-for-windows/).
- **Цены в EUR за плеер, хостинг в Германии и GDPR, рейтинги: не подтверждено.** Страница цен в выдаче была без цифр. Отзывы есть на [Capterra](https://www.capterra.com/p/146305/viewneo/reviews/) и [G2](https://g2.com/products/viewneo/reviews?page=2).

#### Pickcel
- Цены за устройство в месяц, оплата помесячно или за год. Professional: $15 помесячно, $13.50 при годовой оплате, ₹900 + GST в Индии. Планы: Professional, Business, Enterprise. Триал 14 дней с функциями Professional — [Pickcel pricing (internal domain)](https://website.internal.pickcel.com/pricing.html), [support.pickcel.com](https://support.pickcel.com/portal/en/kb/articles/what-are-the-different-types-of-pricing-plans). Zoftwarehub пишет «от $12», Softabase — $15 / $25. Данные не сходятся — [zoftwarehub](https://zoftwarehub.com/en-ae/products/pickcel/pricing), [softabase](https://softabase.com/software/digital-signage/pickcel).
- **Цены в EUR не найдены.** У Pickcel есть гайд по ТВ-меню — [pickcel.com/blog/a-guide-to-tv-menu-boards](https://www.pickcel.com/blog/a-guide-to-tv-menu-boards/).

#### Play Digital Signage (PDS)
- В FAQ вендора: $18 за экран в месяц при помесячной оплате и $12 при годовой. На главной: «от $8». Оплата по фактическому использованию, почасово. Цена снижается с ростом числа экранов. Первый экран бесплатно навсегда, если оставить отзыв в течение 30 дней — [playsignage.com/pricing](https://www.playsignage.com/pricing), [playsignage.com](https://playsignage.com/). Capterra показывает $8 / $12 / $16 (Essential / Pro / Ultimate), что, вероятно, устарело — [Capterra](https://capterra.com/p/154656/Play-Digital-Signage/pricing/).

#### Screenly
- По ITQlick (февраль 2026): $14.30 за экран в месяц при годовой оплате и $16.90 при помесячной. Business: $23.80 / $26.60. Enterprise: $37.50, только годовая. Железо: Screenly Player $219, Player Max $319 — [itqlick.com/screenly/pricing](https://www.itqlick.com/screenly/pricing). Capterra (март 2026) описывает другую модель: Starter $13 «за функцию», до 2 пользователей — [Capterra](https://capterra.com/p/167305/Screenly/). **Данные противоречат друг другу.**
- У Screenly есть open-source версия **Anthias** (бывшая Screenly OSE) для Raspberry Pi и x86-ПК, а также best-effort поддержка ARM64-плат (Rock Pi, Orange Pi). На слабых SoC видео декодируется программно, поэтому 4K не поддерживается — [GitHub Screenly/Anthias](https://github.com/Screenly/Anthias). Есть страница сценария для menu boards — [screenly.io/use-cases/digital-menu-boards](https://www.screenly.io/use-cases/digital-menu-boards/).

#### Mandoe
- На Capterra указаны модель «per feature», бесплатная версия и триал — [Capterra CA](https://www.capterra.ca/software/209373/mandoe), [Capterra AU](https://www.capterra.com.au/software/209373/mandoe). **Цены за экран, HQ, устройства и шаблоны: не подтверждено.** По памяти модели, это австралийская компания с фокусом на menu boards.

#### Signagelive (Великобритания)
- Стандартная лицензия ~$270 за устройство в год (≈£200 / ≈€230). Модель «per player»: 1 лицензия на 1 плеер, до 2 выходов. Для видеостен нужна другая лицензия — [signagelive.com/pricing](https://signagelive.com/pricing). Fugo пересчитывает это в $22.50 в месяц и предупреждает, что договор заключается на год, а продвинутые функции продаются отдельно без публичных цен — [fugo.ai/blog/signagelive-pricing](https://www.fugo.ai/blog/signagelive-pricing/). По ITQlick триала нет — [ITQlick](https://www.itqlick.com/signagelive-digital-signage-platform/pricing). Это **единственный из списка вендоров, кто сам показывает цену в EUR.**

#### EU-native и menu-игроки, найденные при поиске
- **mirabyte FrontFace (Германия):** бессрочная лицензия €599.95 + 19% НДС на устройство без регулярных платежей, либо облачная SaaS-лицензия €39.95 в месяц + НДС. Для menu board нужны экран, Windows-ПК или Android-устройство. Поддерживаются экраны со встроенным Android TV, отдельный плеер тогда не нужен — [softguide.com](https://www.softguide.com/program/frontface), [mirabyte.com menu boards](https://www.mirabyte.com/en/frontface/use-cases/digital-menu-boards.html).
- **Cenareo (Франция):** французская SaaS-платформа для экранных сетей **от 50 экранов**. Работает нативно на Samsung Tizen и Android-плеерах. В HoReCa позиционируется на обновление меню во всей сети из одного места — [lafabriquedunet.fr](https://www.lafabriquedunet.fr/logiciel/cenareo), [cenareo.com/hotel-hospitality](https://cenareo.com/hotel-hospitality), [cenareo.com/en/blog/dynamic-menu-board](https://www.cenareo.com/en/blog/dynamic-menu-board). Заявляет цель стать лидером в Европе — [cbnews.fr](https://www.cbnews.fr/node/47401). Цены: **не подтверждено**.
- **KPN Zakelijk TV (Нидерланды):** narrowcasting входит в ТВ-абонемент от €11.50 за ТВ-экран в месяц, отдельные плеер и софт не нужны. Продаётся только с KPN EEN MKB Internet. Есть отдельная страница для ресторанов — [kpn.com narrowcasting](https://www.kpn.com/zakelijk/televisie/narrowcasting), [kpn.com restaurant](https://www.kpn.com/zakelijk/televisie/narrowcasting/restaurant.htm). Дата цены не указана.
- **Deneva / Icon Multimedia (Испания):** решение с установкой (не self-serve). Связано с POS ресторана, цены и наличие обновляются автоматически. Клиент — Grupo Arzábal, Мадрид. **Данные от 15.10.2020** — [alimarket.es](https://www.alimarket.es/restauracion/noticia/321509/arzabal-digitaliza-sus-menus-de-la-mano-de-icon-multimedia-15-10-2020-11-34).
- **nSign (Испания, HQ не подтверждено):** продвигает «Smart Menuboards» и платформу на французском — [info.nsign.tv/fr/plateforme](https://info.nsign.tv/fr/plateforme).
- **Telelogos Media4Display (Франция, HQ не подтверждено):** отдельное решение для menu boards в fast food и ресторанах — [telelogos.com](https://www.telelogos.com/en/solutions/media4display/menu-boards/).
- **Live Digital Menus:** для независимых заведений. Меню показывается на любом smart TV по ссылке в браузере, без медиаплеера, без Fire Stick и без контрактов — [Capterra](https://www.capterra.com/p/10044696/Live-Digital-Menus/). HQ и цена: **не подтверждено**.
- **Juuno:** стартует от $5 за экран в месяц без setup fee и железа. Есть интеграция с Canva (дизайн загружается прямо в Juuno). Адрес в Laguna Beach, CA, США — [juuno.co small business](https://juuno.co/digital-signage-for/small-business-digital-signage), [juuno.co/blog/digital-menu-sign](https://juuno.co/blog/digital-menu-sign), [Digital Signage Today FAQ](https://www.digitalsignagetoday.com/companies/showcases/juuno/frequently-asked-questions/).
- **vMenu / Digital Menu Controller DMC** есть в каталогах GetApp FR и DE — [getapp.fr/software/2081079/vmenu](https://www.getapp.fr/software/2081079/vmenu). Детали: **не подтверждено**.
- **Rise Vision** (не из ЕС) предлагает menu-приложение, связанное с POS, и оповещения об экранах. Для независимых ресторанов и небольших сетей его рекомендует softguide/theretailexec — [theretailexec.com/de/…](https://theretailexec.com/de/tools/beste-software-fuer-digitale-menuetafeln/).

#### Атрибуты, которые не удалось проверить ни для одного вендора
- Оценка дизайна шаблонов 1–10: **не оценено**, галереи шаблонов в этой сессии были недоступны. Ставить оценку без просмотра галерей — значит её выдумать.
- Платёжные методы (карта, PayPal, SEPA, счёт) и merchant of record: **не подтверждено ни для кого**.
- Рейтинги и число отзывов на G2, Capterra и Trustpilot: **не подтверждено** (ссылки на страницы отзывов приведены выше).

### Inferences
- Для одиночного кафе «справедливая» цена — $5–12 за экран в месяц: Juuno $5, Kitcast $7, Yodeck $8, PDS $8–12, Pickcel $13.50. Fugo ($20–24) и Signagelive (~$22.50 при годовом контракте) по меркам SMB дороги. Значит, новому продукту стоит ориентироваться на **€5–10 за экран** или на тариф «за заведение», а также на бесплатный первый экран (так делают PDS, Yodeck и Fugo с водяным знаком).
- Разовая лицензия mirabyte за ~€600 и пакет KPN «с интернетом» показывают, что европейские локальные игроки продают либо через on-prem, либо через телеком-бандлы. Self-serve SaaS с ценой в EUR, рассчитанный на владельца кафе, среди EU-native игроков почти не встречается (это вывод из найденных источников).
- В этом списке ближе всего к нашему ICP Juuno, Live Digital Menus и Mandoe: простой веб-плеер или Canva, без железа. Но ни один из них не европейский. По найденным данным, менее чем у трёх игроков подтверждена POS-синхронизация для SMB: SmarterSign (Square), Deneva (POS, enterprise), Rise Vision (POS-linked app).

### Gaps
- Рейтинги и число отзывов на G2, Capterra и Trustpilot, а также повторяющиеся жалобы: не получены, площадки заблокированы прокси, поиск исчерпан.
- Поддерживаемые устройства (Tizen consumer/commercial, webOS, Fire TV, Chromecast, BrightSign, браузерный плеер) у Kitcast, Fugo, Pickcel, PDS, Mandoe и Signagelive: не проверены.
- Шаблоны меню, отделение данных от макета, dayparting, офлайн-режим, мобильное приложение, роли: не проверены (исключение — общие описания dayparting из [softguide.de](https://www.softguide.de/funktion/digitale-menueboards)).
- Цены viewneo, Mandoe, Cenareo и Live Digital Menus: публичных цифр в выдаче не было.
- Чтобы закрыть пробелы, в настройках сети сессии нужно разрешить домены kitcast.tv, fugo.ai, viewneo.com, xibosignage.com, pickcel.com, playsignage.com, screenly.io, mandoe.com, signagelive.com, g2.com, capterra.com и trustpilot.com, а также поднять лимит WebSearch (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`) или продолжить в новом сообщении.

## Вопрос 2. Какие EU POS-системы дают пригодные API (позиции меню, цены, out-of-stock) и насколько сложно получить партнёрский доступ?

### Takeaway
**Square** и **Zettle (PayPal)** дают открытые и бесплатные OAuth-API к каталогу, ценам и остаткам, с вебхуками на изменения. По ним можно сделать «живое» меню с флагом sold-out без партнёрского одобрения на старте. **Lightspeed Restaurant (K-Series)** даёт богатое menu-API, но только через партнёрскую программу с одобрением, без self-serve ключей. **В публичном REST API SumUp вообще нет каталога товаров:** есть только платежи, ридеры и транзакции. Встроенных «своих» ТВ-меню у этих POS не найдено.

### Cited Findings
#### Square (первичный источник: OpenAPI spec, версия API `2026-09-16`)
- В API есть Catalog: `/v2/catalog/list`, `/v2/catalog/search`, `/v2/catalog/search-catalog-items`, `/v2/catalog/object/{id}`, `/v2/catalog/batch-retrieve`, `/v2/catalog/images` и др. Есть Inventory: `/v2/inventory/counts/batch-retrieve`, `/v2/inventory/{catalog_object_id}` и др. Есть Webhooks: `/v2/webhooks/subscriptions`, события `catalog.version.updated` и `inventory.count.updated` — [GitHub square/connect-api-specification api.json](https://github.com/square/connect-api-specification).
- `ItemVariationLocationOverrides.sold_out` — boolean. Он ставится автоматически, когда остаток доходит до 0 (если включён учёт остатков), а продавец может поставить его вручную. **«Attempts by an application to set this attribute are ignored»**, то есть поле только для чтения. Есть также `sold_out_valid_until` (RFC 3339, read-only) и `ModifierLocationOverrides.sold_out` (например, кончился сыр, но не бургер) — [GitHub square/connect-api-specification](https://github.com/square/connect-api-specification), [Square docs: monitor sold-out status](https://developer.squareup.com/docs/inventory-api/monitor-sold-out-status-on-item-variation).
- Документация Square «Manage Menus» по Catalog API — [developer.squareup.com/docs/catalog-api/manage-menus](https://developer.squareup.com/docs/catalog-api/manage-menus). Тред на форуме о лучших практиках выгрузки меню и позиций из нескольких локаций — [Square forum](https://developer.squareup.com/forums/t/best-practices-for-pulling-menu-and-item-data-from-multiple-locations-menus/15761).
- Подводные камни: поле `sold_out` исторически не было описано и отсутствовало в SDK. Остаётся открытым вопрос о поведении `sold_out` при выключенном `track_inventory` — [forum 4681](https://developer.squareup.com/forums/t/sold-out-field-not-in-net-sdk-itemvariationlocationoverrides-class/4681), [forum 5125](https://developer.squareup.com/forums/t/bug-catalog-api-for-listing-items-is-missing-a-field/5125), [forum 26282](https://developer.squareup.com/forums/t/clarification-on-catalog-api-sold-out-and-track-inventory-behavior-for-variation-location-overrides/26282).
- Прецедент: signage-платформа SmarterSign показывает графику «SOLD OUT», когда Square помечает позицию распроданной, но только в LIST-виджете — [smartersign.com](https://smartersign.com/support/administration-and-billing/connecting-square-pos-to-smartersign). Нативных menu boards у Square не найдено (там же).
- В каких странах ЕС работает Square (по памяти модели: UK, IE, FR, ES): **не подтверждено** в этой сессии.

#### Zettle by PayPal
- В API есть OAuth 2.0, Product Library API (товары и варианты с UUID, до 99 вариантов), Inventory API (остатки по вариантам, учёт включается на уровне товара) и Pusher API (вебхуки `ProductCreated`, `ProductUpdated`, `ProductDeleted`, `InventoryBalanceChanged`, `InventoryTrackingStarted`, `InventoryTrackingStopped`). Скоупы: `READ:PRODUCT` и `WRITE:PRODUCT` — [developer.zettle.com/docs/api](https://developer.zettle.com/docs/api), [Inventory overview](https://developer.zettle.com/docs/api/inventory/overview), [GitHub iZettle/api-documentation pusher-api](https://github.com/iZettle/api-documentation/blob/master/pusher-api/overview.md).
- По архиву документации (репозиторий deprecated с 09.05.2022) API доступны на рынках UK, SE, NO, DK, FI, DE, NL, FR, ES, IT (плюс BR и MX). FAQ: «it is completely free to use our APIs», возможны rate limits. Приложение бывает self-hosted (один мерчант) или partner-hosted (хостится интегратором, authorization code grant, создаётся через форму в портале) — [GitHub iZettle/api-documentation README](https://github.com/iZettle/api-documentation), [faq.adoc](https://github.com/iZettle/api-documentation/blob/master/faq.adoc), [create-a-partner-hosted-app](https://github.com/iZettle/api-documentation/blob/master/oauth-api/user-guides/create-an-app/create-a-partner-hosted-app.md).
- Противоречие: сводка поиска утверждает, что multi-merchant-приложениям нужно одобрение партнёра Zettle, а в архиве документации 2022 года partner-hosted app создаётся самостоятельно через форму. Требуется проверка на [developer.zettle.com/docs/faq](https://developer.zettle.com/docs/faq). Rate limit Inventory API 4 запроса в секунду взят из сторонней карточки и не подтверждён — [supergood.ai](https://supergood.ai/api-report-card/zettle).

#### SumUp
- Публичный SumUp REST API (OpenAPI 1.0.0 в репозитории sumup-go) содержит только checkouts, customers, memberships, members, roles, readers (Cloud API для терминалов), payouts, refunds, receipts, merchants и transactions. **Эндпоинтов catalog, products, items и inventory нет.** Схема `Product` есть только как «Product details associated with a transaction», то есть строка в транзакции — [GitHub sumup/sumup-go openapi.json](https://github.com/sumup/sumup-go), [developer.sumup.com/terminal-payments](https://developer.sumup.com/terminal-payments/).
- Codat заявляет commerce-интеграцию с SumUp, но какие данные там доступны, не проверено — [codat.io/integrations/commerce-sumup](https://www.codat.io/integrations/commerce-sumup/).
- SumUp POS Pro (бывшие Goodtill и Tiller): **не подтверждено**, поиск исчерпан. По памяти модели, у Goodtill был свой REST API с товарами. Нужна проверка.

#### Lightspeed Restaurant (K-Series; бывший Gastrofix мигрирован в K-Series — не подтверждено)
- Self-serve ключей нет. Разработчик должен пройти одобрение как партнёр, мерчант подключается через Account Manager. Для доступа нужна партнёрская программа LightSpeed — [supergood.ai/docs/lightspeed-restaurant-api](https://supergood.ai/docs/lightspeed-restaurant-api), [tiphaus.com](https://www.tiphaus.com/integration/lightspeed/).
- Поддерживаемой OpenAPI-спеки для K-Series Lightspeed не публикует. В неофициальной спеке есть `/rich-items` и `/o/op/1/menu/load/{menuId}` (загрузка всего меню) — [jentic.com](https://jentic.com/apis/lightspeed.app/lightspeed.md).
- Доступность позиций: когда позиция становится restricted в Lightspeed, приходит вебхук, и интегратор обновляет наличие. Так реализовано у StoreKit, это не документированный эндпоинт «86» — [storekit.com docs](https://storekit.com/docs/guides/integrations/pos/lightspeed-k-series.md).
- Через Codat и Unified.to есть посредники-«агрегаторы» K-Series — [docs.codat.io](https://docs.codat.io/integrations/commerce/lightspeed-k/commerce-lightspeed-k-setup), [unified.to](https://unified.to/integrations/lightspeedkseries.md).

#### orderbird, Toast (UK/IE)
- **Не исследовано:** лимит поиска исчерпан на этих запросах, сайты недоступны. По памяти модели (не подтверждено): у Toast есть Menus API и Stock API для статуса out-of-stock, доступ через партнёрскую программу Toast; в UK и IE Toast работает с 2023–2024 годов. orderbird (Берлин, входит в группу Nexi) даёт API выборочным партнёрам.

### Inferences
- Порядок интеграций для MVP: **1) Square** — публичный API, бесплатно, sold-out в данных, вебхуки; **2) Zettle** — бесплатно, 10 рынков ЕС и EEA, вебхуки на товары и остатки; **3) Lightspeed K-Series** — нужна партнёрская заявка, долгий цикл, но высокая ценность в HoReCa ЕС. SumUp пока не интегрируется: каталога нет, можно только импортировать CSV.
- Square позволяет менюборду **только читать** sold-out, но не ставить его. Значит, «кнопка стоп-листа» в нашем приложении для Square-клиентов должна либо дублировать флаг локально, либо отправлять персонал в Square POS.
- Ни у одного из проверенных POS нет собственного ТВ-меню, поэтому интеграция «POS → ТВ» остаётся нишей для сторонних SaaS (по данным SmarterSign и Square).

### Gaps
- Актуальные условия партнёрства Zettle на 2026 год (нужно ли одобрение для multi-merchant), rate limits.
- Toast UK/IE: menus и stock API, условия партнёрства; orderbird API; SumUp POS Pro API.
- Есть ли у Lightspeed маркетплейс-интеграции с digital signage и встроенные menu boards.
- Рынки Square в ЕС и наличие там Square Catalog API без ограничений.

## Вопрос 3. Где европейские конкуренты слабы (дизайн, языки, поддержка, цена)?

### Takeaway
По найденным данным, у европейских игроков три основные слабости. **Модель продажи** не рассчитана на одиночное кафе: Cenareo продаёт от 50 экранов, Deneva — проектное решение, KPN — бандл с интернетом, FrontFace стоит ~€600 разово и работает на Windows или Android. **Ценообразование непрозрачное** (у viewneo и Cenareo публичных цифр нет). **POS-синхронизация есть только в enterprise** (Deneva). Слабости по дизайну, языкам и поддержке в отзывах проверить не удалось.

### Cited Findings
- Cenareo ориентирован на сети от 50 экранов — [lafabriquedunet.fr](https://www.lafabriquedunet.fr/logiciel/cenareo). Его HoReCa-позиционирование — для владельцев с несколькими точками и сетей — [cenareo.com/hotel-hospitality](https://cenareo.com/hotel-hospitality).
- mirabyte FrontFace: €599.95 + НДС за устройство разово, или €39.95 в месяц + НДС в SaaS. Это в 4–8 раз дороже SaaS-тарифов США за экран — [softguide.com](https://www.softguide.com/program/frontface).
- KPN Zakelijk TV: €11.50 за ТВ продаётся только вместе с KPN EEN MKB Internet — [kpn.com](https://www.kpn.com/zakelijk/televisie/narrowcasting).
- Deneva (Icon Multimedia): POS-синхронизация цен и стоп-листа есть, но это проект для группы ресторанов (2020) — [alimarket.es](https://www.alimarket.es/restauracion/noticia/321509/arzabal-digitaliza-sus-menus-de-la-mano-de-icon-multimedia-15-10-2020-11-34).
- viewneo: в выдаче цен нет, Enterprise только помесячно — [viewneo.com/pricing](https://viewneo.com/pricing), [docs.viewneo.com](https://docs.viewneo.com/en/getting-started/plans-and-subscriptions/).
- Signagelive (UK): годовой контракт, продвинутые функции без публичных цен — [fugo.ai/blog/signagelive-pricing](https://www.fugo.ai/blog/signagelive-pricing/).
- Xibo (UK): дёшево (~£3.50–9 за дисплей), но плееры для Android, webOS и Tizen коммерческие, а установка у себя только через Docker — [GitHub xibo-cms](https://github.com/xibosignage/xibo-cms), [Capterra](https://www.capterra.com/p/182202/Xibo/pricing/).
- На немецко-, франко- и испаноязычные запросы выдача почти полностью состоит из англоязычных обзоров американских вендоров (Rise Vision, NoviSign, Mvix, Spectrio, Yodeck, AIScreen) — [theretailexec.com/de/…](https://theretailexec.com/de/tools/beste-software-fuer-digitale-menuetafeln/), [theretailexec.com/fr/…](https://theretailexec.com/fr/tools/meilleurs-logiciels-affichage-menus-numeriques/), [theretailexec.com/es/…](https://theretailexec.com/es/tools/mejor-software-carteleria-digital-restaurantes/), [softguide.de](https://www.softguide.de/funktion/digitale-menueboards).

### Inferences
- Свободна ниша **self-serve SaaS для одиночного кафе или бара в ЕС**: цена в EUR с НДС, локализация (DE, FR, ES, IT, NL, PL), браузерный или TV-app плеер без своего железа, синхронизация меню с Square и Zettle и красивые шаблоны «из коробки». Найденные EU-native игроки закрывают в основном enterprise-сети и проекты.
- SEO-выдачу на локальных языках занимают переводные обзоры американских вендоров, а локальных SaaS почти нет. Локализованный контент (лендинги «digitale Speisekarte TV», «menu board TV café») — доступный канал привлечения.

### Gaps
- Отзывы (G2, Capterra, Trustpilot) с жалобами на дизайн, языки и поддержку: не получены ни для кого.
- Языки интерфейсов, хостинг в ЕС и заявления о GDPR у viewneo, Cenareo, Xibo, Signagelive и FrontFace: не проверены.
- Специфика кальянных (hookah lounges), например цены на смеси и возрастные ограничения: в выдаче ничего не найдено.
