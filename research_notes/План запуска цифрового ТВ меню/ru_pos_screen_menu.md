# Российские POS-системы для HoReCa: ТВ-меню (меню-борд) и открытость API для стороннего SaaS цифрового меню

Дата составления: 30.10.2026. Ограничения метода (важно для писателя отчёта):
- WebFetch в этой сессии заблокирован для vc.ru, saby.ru, iiko.ru, api-ru.iiko.services (ошибка DNS из-за сетевого allowlist сессии). Все находки ниже взяты из поисковых сниппетов и сводок поисковика, а не из полного чтения страниц. Уверенность средняя; цифры стоит перепроверить по первоисточнику перед публикацией.
- Лимит веб-поиска на этот ход исчерпан до того, как удалось проверить кальянные POS, отзывы на otzovik/Яндекс и официальный список вебхуков iiko. Эти пункты вынесены в Gaps.

## Вопрос 1. Раздают ли POS-вендоры экранное меню бесплатно (то есть это уже commodity), или их решение слабое/дорогое?

### Takeaway
Ни один из найденных POS-вендоров не раздаёт гостевой меню-борд бесплатно. Нативный меню-борд есть только у двух крупных игроков, и он платный: iiko (модуль iikoScreen, около 1 500–2 000 ₽/мес и выше вместе с iikoWeb по оценке vc.ru на август 2025) и r_keeper (Menu Board Pro, лицензия на каждый экран, цена «уточняйте», индивидуальный дизайн 50–100 тыс. ₽). У Saby Presto, Quick Resto, Эвотор, Frontpad, Tillypad и Paloma365 нашлись только экраны статуса заказа, очереди и кухни, а гостевого ТВ-меню с ценами нет. Дешёвым commodity меню-борд стал у сторонних сервисов: у Menura бесплатный тариф на 1 экран, PRTV «от 0 ₽», и они уже тянут меню из iiko, r_keeper и Quick Resto. Конкурент нашего SaaS здесь не POS-вендор, а такие сервисы.

### Cited Findings

#### Сводная матрица (подробности и источники ниже)

| Система | Нативный ТВ-меню-борд | Цена функции | Устройства | Автоцены/стоп-лист из POS | Расписание | API для третьих лиц |
|---|---|---|---|---|---|---|
| iiko | Да, iikoScreen (по vc.ru); в витрине store.iiko.ru есть сторонний INGI-server | ≈1 500–2 000 ₽/мес+ с iikoWeb (vc.ru, авг. 2025); INGI-server: не подтверждено | не подтверждено | Да, блюда на стопе пропадают (vc.ru) | не подтверждено | iikoCloud API, бесплатно в облачных тарифах |
| r_keeper | Да, r_keeper Menu Board / Menuboard Pro | Лицензия на экран, 1 или 12 мес; цена «уточняйте»; дизайн 2D ≈50 000 ₽, 3D ≈100 000 ₽ | FullHD-ТВ, подключённый к ПК; сервер ставится как служба | Да, цены из кассы, стоп-лист учитывается | Да, по дням, времени и акциям | White Server API v2 и Delivery API, оба платные по лицензии |
| Saby Presto | Нет гостевого меню-борда; есть Presto Client Monitor (статус заказов и реклама) | не подтверждено | Планшет или ТВ | н/п | н/п | Saby API (каталог, прайс, стоп-лист); стоимость не подтверждена |
| Quick Resto | Нет; есть Quick Resto Display (дисплей покупателя) и Informer (очередь) | н/п | iOS; Android TV или планшет | н/п | н/п | REST/JSON, HTTP Basic; API на тарифе «Премиум» (по Toolfox) |
| Эвотор | Официального приложения меню-борда не найдено; есть сторонние «Табло заказов» | н/п | Android TV, ТВ-приставки, планшеты, Эвотор Power | н/п | н/п | Облачный REST API с токеном |
| Frontpad / Tillypad / Paloma365 | Не найдено (KDS, e-menu/QR) | н/п | н/п | н/п | н/п | не исследовано (лимит поиска) |
| Poster | В РФ закрыт с 01.03.2022 (данные противоречивы) | н/п | н/п | н/п | н/п | н/п |
| Мой Кассир | Да, «ТВ-экраны: меню-борд и очередь заказов» | не подтверждено | Android TV, FullHD 1920×1080 | не подтверждено | не подтверждено | не исследовано |

#### iiko
- В обзоре vc.ru «Как сделать меню на телевизоре для кофейни? Сравниваем 5 сервисов для меню-бордов в России» iikoScreen описан как модуль iiko для вывода на экраны меню-бордов и электронной очереди. Плюс по этой статье: «полная интеграция с кассой и складом iiko. Блюда "на стопе" пропадают с экрана автоматически» — [vc.ru](https://vc.ru/retail/2142718-menu-na-televizore-dlya-kofeyni)
- Цена по vc.ru (цены на август 2025): модуль требует основных лицензий iiko; связка iikoWeb + iikoScreen оценена примерно в 1 500–2 000 ₽/мес и выше. Минусы по статье: стоимость и привязка к экосистеме, при смене учётной системы меню-борд пропадает. Вывод автора: решение логично для тех, кто уже на iiko — [vc.ru](https://vc.ru/retail/2142718-menu-na-televizore-dlya-kofeyni)
- Официальной страницы продукта «iikoScreen» на iiko.ru поиск не вернул. Название модуля и цену по первоисточнику iiko не подтвердить (не подтверждено) — [поиск: Software Informer, нерелевантно](https://iiko-customer-display-screen-front.software.informer.com/)
- В витрине дополнительных решений iiko (store.iiko.ru) есть «INGI-server — Красочные менюборды для вашего ресторана», рядом с QR-меню и KDS. Цена не подтверждена — [store.iiko.ru](https://store.iiko.ru/)
- Сторонний сервис PRTV выводит меню с ценами и фото из iiko на Smart TV или Android TV. Порядок такой: в iiko настраивается ключ API, API подключается к конструктору, в редакторе слайдов выбирается виджет «Меню ресторана», затем указываются ID заведения и ID внешнего меню — [s.prtv.su](https://s.prtv.su/storonnie-servisy/instrukcziya-po-dobavleniyu-menyu-restorana)
- Внешние интеграции обычно берут «внешнее меню» iiko, которое создаётся в iikoWeb или iikoOffice — [prowizard.store](https://prowizard.store/company/articles/rabota_s_menyu_v_iiko_vneshnee_menyu_iiko_i_qr_menyu/); [hotbot.ai](https://hotbot.ai/help/iiko-extmenu)
- QR-меню-сервисы пишут, что цены, стоп-позиции и модификаторы подтягиваются из iiko автоматически — [stayday.ru](https://stayday.ru/blog/integraciya-vitriny-i-menyu-s-iiko/)
- Базовая цена iiko для контекста. Агрегаторы называют «4 тарифа от 2 500 ₽/мес» и тариф «Корнер» за 2 500 ₽/мес — [crmindex.ru](https://crmindex.ru/products/iiko). Партнёрские сайты дают за iikoCloud Pro и Enterprise разброс примерно 7 990–10 600 ₽/мес (Pro «от 8 600 ₽/мес с подключением сторонних приложений по API»). Цифры расходятся, к какому именно сайту относится каждая из них, не проверено, страницы не открывались — [denvic.ru](https://denvic.ru/blog/obshchepit/tarif-iikocloud-pro-professionalnyy-tsena-i-opisanie-vozmozhnostey/); [multi-bit.com](https://multi-bit.com/iiko_license/iiko_enterprise); [dazeproject.ru](https://dazeproject.ru/iikoCloudEnterprise/)

#### r_keeper (UCS)
- Продукт: «Меню борд для фаст фуда» / r_keeper Menu Board. Меню и спецпредложения выводятся на экраны вместо печатных табло, названия, цены и картинки берутся из кассовой системы. Смена по расписанию («утром завтраки, днём бизнес-ланчи»), по дням недели, времени суток и периодам акций; расписание учитывает стоп-лист. Можно выделять приоритетные блюда и крутить промо-видео и рекламу партнёров. Экранами служат обычные FullHD-телевизоры, подключённые к компьютеру. Правки вносятся из менеджерской станции r_keeper. Индивидуальный 2D- или 3D-дизайн делается под заказ — [rkeeper.ru](https://rkeeper.ru/products/r_keeper/jelektronnye-menju-bordy/); [ucs.ru](https://www.ucs.ru/products/r_keeper/Jelektronnye-menju-bordy/)
- Цена на сайте UCS: «уточняйте». На части страниц сказано, что продукт входит в модуль r_keeper Manager, у старых реселлеров RK7 он идёт отдельным модулем со своей ценой. Текущая цена не подтверждена — [ucs.ru](https://www.ucs.ru/products/r_keeper/Jelektronnye-menju-bordy/); [rkeeper.ru/pricesall](https://rkeeper.ru/pricesall/)
- Menuboard Pro (документация): много экранов, блюда по категориям, автосмена меню по условиям, выделение маркетингово-приоритетных блюд. Лицензируется число рабочих клиентов, то есть экранов: «одна лицензия — один экран». Сроки лицензии 1 мес и 12 мес. Нужна мастер-лицензия, и без лицензии меню-борд не подключается к кассовому серверу — [docs.rkeeper.ru: Описание продукта](https://docs.rkeeper.ru/menuboard/pol-zovatel-skaya-dokumentatsiya-19625861.html); [docs.rkeeper.ru: Menuboard Pro](https://docs.rkeeper.ru/menuboard/menuboard-pro-19625832.html)
- Архитектура: сервер Menu Board ставится как служба с автозапуском, при установке выбирается свободный порт. В приложении есть разделы Экраны, Блоки, Сценарии, Сцены (медиа, текст, меню), Настройки, Лицензии. Каждому экрану нужна минимум одна сцена, один блок и один сценарий. Преднастроенные шаблоны блоков появились с версии 0.0.0.43. Документированные версии 0.0.0.38, 0.0.0.43, 0.0.0.55 датированы 2021 годом — [docs.rkeeper.ru: Установка](https://docs.rkeeper.ru/menuboard/ustanovka-sistemy-19626012.html); [docs.rkeeper.ru: Структура приложения](https://docs.rkeeper.ru/menuboard/struktura-priloyoeniya-26514948.html); [docs.rkeeper.ru: Настройка блоков](https://docs.rkeeper.ru/menuboard/nastrojka-blokov-26514149.html)
- Дизайн экранов у дилера «Альфа Софт»: разработка библиотеки индивидуального статичного 2D-дизайна около 50 000 ₽, динамичного 3D около 100 000 ₽ (для гостевого экрана, второго экрана и меню-борда) — [ucs-soft.ru](https://ucs-soft.ru/product-category/software/r-keeper/)
- Позиционирование: фастфуд и фудкорты — [rkeeper.ru blog: меню борды для фастфудов](https://rkeeper.ru/blog/elektronnye-menyu-bordy-novaya-tekhnologiya-dlya-fastfudov/); [rkeeper.ru blog: MenuBoard на фудкорте](https://rkeeper.ru/blog/r-keeper-menuboard-kak-vydelitsya-na-fudkorte/)
- Для сравнения QR-меню r_keeper: Lite (только просмотр) 1 000 ₽/мес SaaS, PRO (просмотр, заказ, оплата) 3 000 ₽/мес — [docs.rkeeper.ru](https://docs.rkeeper.ru/fordealers/ru/qr-menyu-elektronnoe-menyu-61866487.html). У партнёра Carbis аналогичные варианты стоят 2 100 и 4 500 ₽/мес — [soft.carbis.ru](http://soft.carbis.ru/qr_menu)
- Базовая цена r_keeper: в каталоге-агрегаторе «от 3 500 ₽». Официальный прайс: [rkeeper.ru/pricesall](https://rkeeper.ru/pricesall/) — [a2is.ru](https://a2is.ru/catalog/programmy-dlya-kafe-i-restoranov/compare/rkeeper/quick-resto)

#### Saby Presto (СБИС/Тензор)
- Отдельного гостевого меню-борда с ценами и стоп-листом поиск не нашёл. Есть Presto Client Monitor: приложение ставится на планшет или телевизор и показывает гостям номера заказов (готовятся или готовы), умеет выводить рекламу, а без заказов показывает заставку — [saby.ru/apps/SbisHallScreenMobile](https://saby.ru/apps/SbisHallScreenMobile); [saby.ru/help/presto/cook_displey/clients](https://saby.ru/help/presto/cook_displey/clients)
- Кухонный экран Presto Prod Monitor работает в том числе на телевизоре с медиаплеером — [saby.ru/help/presto/cook_displey/tv](https://saby.ru/help/presto/cook_displey/tv); [saby.ru/help/presto/cook_displey/cook_work/tv](https://saby.ru/help/presto/cook_displey/cook_work/tv)
- На странице автоматизации кухни, по сводке поисковика, в каталоге оборудования предлагается телевизор «для меню-борда в фастфуде», но без отдельной конфигурации и цены. Там же стоп-лист помечен «онлайн скоро» — [saby.ru/presto/kitchen](https://saby.ru/presto/kitchen)
- Гостевое меню у Saby сделано как QR-меню в браузере: выбор дизайна, настройка меню, генерация QR-кодов — [saby.ru/presto/emenu](https://saby.ru/presto/emenu); [saby.ru/help/presto/menu/electron](https://saby.ru/help/presto/menu/electron)
- Базовая цена Saby Presto: не подтверждено (страницы saby.ru не открылись).

#### Quick Resto
- Нативного ТВ-меню-борда не найдено. Есть Quick Resto Display, дисплей покупателя на iOS, где видны состав заказа, цены и сумма — [App Store](https://apps.apple.com/us/app/quick-resto-display/id987939211?uo=4). У QR Display (iOS 9–10) на свободной кассе можно показывать акции — [App Store](https://apps.apple.com/py/app/qr-display-ios-9-10/id6447509711)
- Quick Resto Informer — экран электронной очереди на Android TV или планшете; KDS и экран должны быть в одной Wi-Fi-сети. Страница описана поисковиком как «довольно старая» — [quickresto.kz](https://quickresto.kz/support/evotor/evotor-hardware/informer-evotor/)
- Сторонний PRTV заявляет автоматическую загрузку позиций и цен из QuickResto, iiko и R-Keeper — [s.prtv.su](https://s.prtv.su/menyu-bordy-slajd-shou-dlya-restoranov-kafe-fastfuda)
- Тарифы по агрегатору Toolfox (без даты тарифа, страница аналогов обновлена в июне 2026): «Старт» 2 490 ₽/мес, «Стандарт» 4 990 ₽/мес, «Премиум» 8 990 ₽/мес. В «Премиум» входят API-интеграции, неограниченное число касс и KDS — [toolfox.ru](https://toolfox.ru/services/s/quick-resto). CRMindex отдельно указывает опцию «Лояльность.API» за 4 990 ₽/мес — [crmindex.ru](https://crmindex.ru/products/quick_resto). Официальный прайс quickresto.ru: не подтверждено.

#### Эвотор
- Официального приложения меню-борда в Эвотор Маркете поиск не нашёл. Есть стороннее «Табло заказов» на Android TV, ТВ-приставках, Android-планшетах или внешнем дисплее Эвотор Power, оно показывает номера заказов — [ascintegraciya.ru](https://ascintegraciya.ru/glavnaya/product/tablo-zakazov)
- На horeca.evotor.ru для кофеен упомянуты кухонный экран и ТВ-очередь, подробностей о меню-борде нет — [horeca.evotor.ru](https://horeca.evotor.ru/)

#### Frontpad, Tillypad, Paloma365
- Paloma365: справочник «Меню» настраивает отображение номенклатуры во фронт-офисе, есть экран повара (KDS). ТВ-меню-борда не найдено — [help.paloma365.com](https://help.paloma365.com/knowledgebase/help-guides-specials-s_menu/); [paloma365.kz/kitchen-screen](https://paloma365.kz/kitchen-screen)
- Tillypad: есть удалённый мониторинг терминалов и электронное меню Tillypad.menu для бесконтактного заказа, про ТВ-экраны ничего не найдено — [tillypad.ru/components](https://tillypad.ru/components)
- Frontpad: в сравнении упоминаются онлайн-заказ и лояльность, про экраны ничего — [picktech.ru](https://picktech.ru/catalog/restaurant-pos-software/compare/frontpad-vs-paloma365/)

#### Poster POS
- Источники противоречат друг другу. Startpack пишет, что Poster закрыл доступ клиентам из России и Беларуси 1 марта 2022 и предлагает альтернативы (Quick Resto, Restik, POS FUSION) — [startpack.ru](https://startpack.ru/application/poster-automation). Обзор onlain-kassy.ru говорит то же: «С 1 марта 2022 года программа для общепита Poster POS больше не работает в России!» — [onlain-kassy.ru](https://onlain-kassy.ru/ispolzovanie/obzor/poster-pos.html)
- С другой стороны, описание приложения в App Store упоминает печать фискальных чеков «на территории Украины и РФ» (версии 2025 года; описание, вероятно, устарело) — [App Store](https://apps.apple.com/us/app/poster-pos-%D0%BE%D0%BD%D0%BB%D0%B0%D0%B9%D0%BD-%D0%BA%D0%B0%D1%81%D1%81%D0%B0/id691098784?l=ru). На livebusiness.ru есть единичный отзыв от 26.06.2026, где кафе пишет, что работает с Poster с 2018 года — [livebusiness.ru](https://www.livebusiness.ru/tool/1873/)

#### Другие системы и сторонние меню-борд-сервисы (конкуренты нашего SaaS)
- «Мой Кассир»: в базе знаний есть раздел «ТВ-экраны: меню-борд и очередь заказов». Работает на телевизорах с Android, стандартный размер изображения 1920×1080 px, рекомендованы LED-ТВ не ниже FullHD — [help.moykassir.ru](https://help.moykassir.ru/tv-screens/)
- Menura: бесплатный тариф на 1 экран с логотипом сервиса, отключение логотипа около 650–700 ₽/мес (vc.ru, цены на август 2025) — [vc.ru](https://vc.ru/retail/2142718-menu-na-televizore-dlya-kofeyni)
- PRTV: универсальный инструмент вывода контента, меню-борд в нём одна из функций, цена «от 0 ₽, но есть нюанс» (по vc.ru). Есть готовые шаблоны, в том числе для кофеен — [vc.ru](https://vc.ru/retail/2142718-menu-na-televizore-dlya-kofeyni); [s.prtv.su](https://s.prtv.su/menyu-bordy-slajd-shou-dlya-restoranov-kafe-fastfuda); [s.prtv.su шаблон кофейни](https://s.prtv.su/menyu-bordy/kofejnya/menyu-bord-kofejnya-biznes-delovoj-stil-7)
- Infostart: решение «медиадисплей покупателя», которое можно использовать как графический меню-борд, стоит 18 300 ₽ — [infostart.ru](https://infostart.ru/marketplace/integraciya_i_obmen_dannymi/pos_terminal/)
- Также в выдаче есть remenu.ru (сервис меню-бордов) — [remenu.ru](https://www.remenu.ru/menuboard-broadcast.html)

#### Слабые места и жалобы (что удалось найти)
- iikoScreen: дорого для одиночной кофейни, жёсткая привязка к экосистеме iiko — [vc.ru](https://vc.ru/retail/2142718-menu-na-televizore-dlya-kofeyni)
- r_keeper Menu Board: нужен ПК/сервер под Windows-службу и ТВ, подключённый к компьютеру; без лицензии не работает; документация от 2021 года и привязана к r_keeper 7; кастомный дизайн платный (50–100 тыс. ₽) — [rkeeper.ru](https://rkeeper.ru/products/r_keeper/jelektronnye-menju-bordy/); [docs.rkeeper.ru](https://docs.rkeeper.ru/menuboard/menuboard-pro-19625832.html); [ucs-soft.ru](https://ucs-soft.ru/product-category/software/r-keeper/)
- Quick Resto: при масштабировании на сеть возможны ограничения — [ncrim.ru](https://ncrim.ru/interesnoe/view/rejting-programm-dla-avtomatizacii-kafe-iiko-quick-resto-r-keeper-cto-vybrat)

### Inferences
- Commodity ли меню-борд? У POS-вендоров нет: у iiko и r_keeper это платный модуль (у r_keeper лицензия на каждый экран), а у остальных гостевого меню-борда нет. Но рынок сторонних меню-бордов уже ушёл в бесплатный и дешёвый сегмент (Menura free, PRTV от 0 ₽, около 650–700 ₽/мес за white-label), и такие сервисы уже интегрированы с iiko, r_keeper и Quick Resto. Новому SaaS придётся отстраиваться дизайном, синхронизацией стоп-листа и мультиэкранностью, а не самим фактом вывода меню на ТВ.
- Решение r_keeper функционально богатое (сцены, сценарии, расписание, стоп-лист, мультиэкран), но тяжёлое: Windows-сервер, ПК на экран, лицензия на экран, дорогой кастомный дизайн. Оно рассчитано на фастфуд и фудкорты с бюджетом, а не на маленькую кофейню или кальянную.
- Оценки дизайна шаблонов (1–10) — это вывод по косвенным признакам, скриншоты шаблонов не просматривались:
  - r_keeper Menu Board — около 4/10: «преднастроенные шаблоны блоков» появились только в версии 0.0.0.43 (2021), а красивый дизайн продаётся отдельно за 50–100 тыс. ₽. Значит, «из коробки» дизайн базовый.
  - iikoScreen — оценить нельзя (не подтверждено): шаблонов в источниках нет.
  - Saby Client Monitor, Эвотор «Табло заказов», Quick Resto Informer — к меню не относятся (экраны номеров заказов), оценка неприменима.
  - Сторонние сервисы (PRTV, Menura) — оценить нельзя без просмотра. У PRTV есть стилизованные шаблоны для кофеен («готика», «бизнес»), то есть дизайн у них конкурентный дифференциатор.
- Multi-location и offline-режим ни у iiko, ни у r_keeper в найденных источниках прямо не описаны. Для r_keeper offline, вероятно, обеспечен локальным сервером в ресторане, но это не подтверждено.

### Gaps
- Официальная страница, цена (за экран или за точку) и шаблоны iikoScreen: iiko.ru не открылся, поиск официальную карточку не вернул. Единственный источник — vc.ru, август 2025. Возможно, «iikoScreen» — неофициальное название, и это стоит проверить.
- Цена и функции INGI-server в store.iiko.ru не подтверждены.
- Текущая цена r_keeper Menu Board Pro за экран и в месяц не опубликована («уточняйте»).
- Базовая цена Saby Presto и официальный прайс Quick Resto не подтверждены, saby.ru и quickresto.ru не открылись.
- Отзывы пользователей именно о меню-бордах (otzovik, Яндекс отзывы, Habr) не найдены, лимит поиска исчерпан.
- POS-системы для кальянных (есть ли у них ТВ-меню) не исследованы, лимит поиска исчерпан.
- Есть ли в Эвотор Маркете приложения «меню на ТВ» с ценами и стоп-листом из кассы, не подтверждено, так как market.evotor.ru напрямую не проверялся.
- Текущий статус Poster в РФ на 2026 год не прояснён (см. противоречие выше).

## Вопрос 2. Какие POS-интеграции полезнее всего строить первыми для российских кафе, кофеен и кальянных, и насколько сложно получить доступ?

### Takeaway
Первым стоит строить iiko. По косвенным данным это лидер рынка: выручка 6,4 млрд ₽ в 2025 году (+59%), большинство новых ресторанов открывается на iiko. Доступ к iikoCloud API и документации бесплатный, в облачных тарифах Pro и Enterprise API уже включён, ключ apiLogin клиент сам создаёт в iikoWeb, и вендор прямо разрешает делать интеграцию «даже не сообщая нам». Вторыми идут Quick Resto (сильна в малом бизнесе и кофейнях; простой REST с HTTP Basic, но API, по агрегатору, только на тарифе «Премиум» 8 990 ₽/мес) и Saby Presto (документированный API каталога, прайса и стоп-листа с оповещениями, но лимиты 25 записей на страницу и 1 000 товаров). Эвотор (облачный REST с токеном) — для микрокофеен на смарт-терминалах. r_keeper самый закрытый и дорогой: White Server API платный, токен выдают через integrations@rkeeper.ru, нужна лицензия модуля. Плюс у r_keeper свой Menu Board — его стоит делать последним или под конкретного крупного клиента.

### Cited Findings

#### iiko — iikoCloud API (iikoTransport)
- Официальный портал разработчика: «доступ к iikoAPI и документации бесплатный», платит пользователь iiko за подключение сторонних приложений. «У всех пользователей iikoCloud есть встроенный API, поэтому вы можете создать интеграцию самостоятельно, даже не сообщая нам об этом». Для облачных тарифов Pro и Enterprise стоимость iikoAPI для собственных разработок уже включена в тариф; для локальной версии доступ стоит от 500 ₽/мес (лицензия у дилеров). На портале можно зарегистрироваться как разработчик — [api.iiko.ru/developersresource](https://api.iiko.ru/developersresource)
- Ключ apiLogin настраивается в iikoWeb («Настройка iikoCloud API в iikoWeb») — [help.smartofood.ru](https://help.smartofood.ru/nastrojka-iikocloud-api-v-iikoweb)
- Базовый URL https://api-ru.iiko.services, авторизация Bearer-токеном (по неофициальной TypeScript-библиотеке) — [context7.com/salesduck/iiko-cloud-api](https://context7.com/salesduck/iiko-cloud-api)
- Возможности по стороннему плагину WooCommerce: импорт организаций, терминалов и номенклатуры (категории, товары, блюда), типов оплат; стоп-листы «via webhook» (в платной версии); вкладка Webhooks в настройках; без apiLogin плагин не работает — [wordpress.org/plugins/wc-iikocloud](https://en-gb.wordpress.org/plugins/wc-iikocloud/)
- Вебхуки iikoCloud существуют. Например, у коннектора ApiMonster есть триггер на событие iiko «Обновление резерва» (ReserveUpdate) — [apimonster.ru](https://apimonster.ru/connector/trigger/iiko/event/ReserveUpdate/). Точное имя события стоп-листа и его формат по официальной документации не подтверждены.
- Масштаб и доля. Выручка iiko в 2025 году 6,4 млрд ₽ против 4,0 млрд ₽ в 2024 (+59%) — [TAdviser](https://www.tadviser.ru/index.php/%D0%9A%D0%BE%D0%BC%D0%BF%D0%B0%D0%BD%D0%B8%D1%8F:Iiko_(%D0%B0%D0%B9%D0%BA%D0%BE)). В обзоре TAdviser iiko названа лидером среди разработчиков ПО для HoReCa по выручке (>4,2 млрд ₽ на момент того обзора) — [TAdviser: обзор рынка цифровизации HoReCa](https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%9E%D0%B1%D0%B7%D0%BE%D1%80_%D1%80%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D1%80%D1%8B%D0%BD%D0%BA%D0%B0_%D1%86%D0%B8%D1%84%D1%80%D0%BE%D0%B2%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D0%B8_Horeca:_%D1%82%D1%80%D0%B5%D0%BD%D0%B4%D1%8B_%D0%B8_%D1%82%D0%B5%D1%85%D0%BD%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8)
- Партнёрские оценки, их нужно перепроверять: «большинство новых ресторанов открывают на iiko, доля R-keeper постепенно сокращается», при этом точной статистики нет; материал написан со стороны партнёра. Атрибуция к странице не проверена — [denvic.ru](https://denvic.ru/blog/obshchepit/iiko-i-r-keeper-sravnenie-dvukh-samykh-populyarnykh-sistem-avtomatizatsii-obshchepita/). Данные на 2023 год: на iiko более 66 000 заведений, у r_keeper более 65 000 внедрений по миру; цифры маркетинговые, точная страница не проверена — [multi-bit.com](https://multi-bit.com/avt_iiko/iiko_rkeeper). На сентябрь 2021 года на iiko автоматизировано 58 000 ресторанов, из них работают 40 000 (атрибуция не проверена) — [trade-drive.ru](https://trade-drive.ru/materialy/publikatsii/pochemu-restorany-vybirayut-iiko/)

#### r_keeper — White Server API v2 / Delivery API
- White Server API: актуальна v2, v1 не поддерживается с 2020 года. «Интеграция платная. Для ее использования требуется купить лицензию. Отправить запрос на интеграцию по адресу integrations@rkeeper.ru» (так получают токен). Методы: GetMenu, UpdateMenu, GetStopList, GetMenuByParams. Запросы бывают синхронными и асинхронными; для асинхронных нужен внешний сервис с callback-адресом, доступный White Server — [docs.rkeeper.ru/ws/white-server-api](https://docs.rkeeper.ru/ws/white-server-api); [docs.rkeeper.ru: White Server API v2](https://docs.rkeeper.ru/ws/white-server-api-v2-27845668.html)
- Delivery API: «модуль работы с меню и заказами через открытое API». Можно получить меню с учётом стоп-листа, создать, изменить или отменить заказ (только свои). Нужна лицензия «R-Keeper модуль Delivery_Api» — [rkeeper.ru/products/r_keeper/deliveryapi](https://rkeeper.ru/products/r_keeper/deliveryapi/); [docs.rkeeper.ru: подключение по API](https://docs.rkeeper.ru/delivery/podklyuchenie-po-api-4043842.html)
- Синхронизация стоп-листа в Delivery идёт по интервалу, минимум 2 минуты; меню запрашивается от имени технического кассира White Server Agent, которому нужны права на закрытые позиции — [docs.rkeeper.ru: синхронизация меню](https://docs.rkeeper.ru/delivery/sinhronizatsiya-menyu-61870544.html)
- Масштаб: более 34 000 действующих ресторанов на платформе r_keeper (выставочная презентация, дата не указана) — [gastmesse.at PDF](https://www.gastmesse.at/fileadmin/exhibitor_upload/25577_67220b0789765.pdf)

#### Saby Presto — Saby API
- API для Presto позволяет загружать заказы на доставку и брони, а также «поддерживать в актуальном состоянии меню на вашем сайте или в приложении». Обмен идёт по HTTPS/JSON с online.sbis.ru. Подготовка: добавить приложение в Saby, настроить сервисную авторизацию, опубликовать каталог и прайс-лист, получить ID точки продаж и прайс-листа — [saby.ru/help/integration/api/app_presto](https://saby.ru/help/integration/api/app_presto)
- Получение блюд: GET https://api.sbis.ru/retail/v2/nomenclature/list; не более 25 записей на страницу, не более 1 000 товаров в каталоге, вложенность до 3 уровней; параметр noStopList исключает позиции в стоп-листе — [saby.ru: список блюд для доставки](https://saby.ru/help/integration/api/app_presto/Presto_delyvery/catalog); [saby.ru: получить меню](https://saby.ru/help/integration/api/app_presto/Presto_delyvery/price)
- По сводке поисковика, в разделе API есть отдельный метод получения списка позиций в стоп-листе и настройка оповещений об изменениях — [saby.ru/help/integration/api/app_presto](https://saby.ru/help/integration/api/app_presto)
- Стоимость доступа к API и условия для разработчиков: не подтверждено.

#### Quick Resto — Quick Resto API
- API: сервер принимает JSON по HTTPS методами GET и POST, авторизация HTTP Basic, база https://{layer_name}.quickresto.ru/platform/online/api/... Блюда получают через list?moduleName=warehouse.nomenclature.dish&className=ru.edgex.quickresto.modules.warehouse.nomenclature.dish.Dish. Типовой кейс — «выгрузка на сайт актуального меню с ценами» — [rche.ru](https://rche.ru/6120_integraciya-sajtarestorana-s-api-servisa-quick-resto.html)
- Неофициальный справочник «QuickResto API» v2.92 (OpenAPI) — [gitverse.ru/pyadminru/QuickRestoPy](https://gitverse.ru/pyadminru/QuickRestoPy/content/master/doc/index.html)
- Метод или объект стоп-листа в найденных материалах не описан (не подтверждено). Вебхуков не найдено; ApiX Drive обменивается с Quick Resto по интервалу, то есть поллингом — [apix-drive.com](https://apix-drive.com/ru/quickresto)
- Доступ: API-интеграции входят в тариф «Премиум» 8 990 ₽/мес (по Toolfox) — [toolfox.ru](https://toolfox.ru/services/s/quick-resto). Отдельно есть «Лояльность.API» за 4 990 ₽/мес — [crmindex.ru](https://crmindex.ru/products/quick_resto)
- Сегмент: Quick Resto популярна благодаря доступной цене и гибкости, то есть сильна в малом бизнесе — [ncrim.ru](https://ncrim.ru/interesnoe/view/rejting-programm-dla-avtomatizacii-kafe-iiko-quick-resto-r-keeper-cto-vybrat)

#### Эвотор — облачный REST API
- REST API v2 работает с API-токеном; ID приложения нужен только для PUSH-уведомлений; права задаются в разделе интеграции портала разработчика (неофициальный PHP SDK со ссылками на developer.evotor.ru) — [github.com/b1tc0re/evotor-php-sdk](https://github.com/b1tc0re/evotor-php-sdk)
- Товары доступны через эндпоинты вида /api/v1/inventories/stores/.../products; для обмена с 1С в личном кабинете нужно купить приложение обмена — [infostart.ru](https://infostart.ru/public/2292160/)
- Публичный API и маркетплейс market.evotor.ru существуют — [qna.habr.com](https://qna.habr.com/q/683062). Комиссия маркетплейса и правила публикации не подтверждены.

### Inferences
- Порядок интеграций для кофеен, кафе и кальянных:
  1. iiko — самая большая база, бесплатный и самообслуживаемый доступ для облачных клиентов, есть внешнее меню, стоп-листы и вебхуки. Готовые конкуренты (PRTV) уже работают через этот же путь (ключ API, ID организации, ID внешнего меню), значит онбординг клиента без участия вендора реален.
  2. Quick Resto — кофейни и малые кафе, простой REST. Риски: API может требовать дорогой тариф клиента, стоп-лист и вебхуки не подтверждены (вероятно, нужен поллинг).
  3. Saby Presto — документированный API со стоп-листом и оповещениями, но лимит в 1 000 товаров и 25 записей на страницу; стоимость доступа не ясна.
  4. Эвотор — микрокофейни на смарт-терминалах; простой токен, но это розничная модель товаров без HoReCa-понятий (стоп-лист, модификаторы) — гипотеза, не проверено.
  5. r_keeper — дорого (лицензия Delivery_Api или White Server), токен через integrations@rkeeper.ru, стоп-лист обновляется не чаще раза в 2 минуты, и у вендора есть свой Menu Board Pro. Только под крупного клиента.
- Для кальянных и мелких точек без POS-интеграции нужен ручной редактор меню или импорт из CSV/Google Sheets: такие заведения могут сидеть на Эвотор, Quick Resto или вообще без POS. Это вывод, не подтверждено данными.
- Поскольку у iiko меню-борд платный (около 1 500–2 000 ₽/мес+), SaaS с ценой ниже или сопоставимой, но с лучшим дизайном и мультиэкраном, может конкурировать даже внутри базы iiko. Решающий фактор — синхронизация стоп-листа, которая у iikoScreen встроена.

### Gaps
- Официальный список вебхуков iikoCloud (имя события стоп-листа, например StopListUpdate) не подтверждён: api-ru.iiko.services не открылся, поиск официальную страницу не вернул.
- Rate limits iikoCloud API и требования к сертификации или публикации в store.iiko.ru не найдены.
- Цена лицензий r_keeper Delivery_Api и White Server в рублях не найдена.
- Платный ли доступ к Saby API для стороннего разработчика, не подтверждено.
- Официальная документация Quick Resto API (quickresto.ru/api) не открывалась; есть ли API на младших тарифах и метод стоп-листа, не подтверждено.
- Комиссия и условия Эвотор Маркета, есть ли вебхуки на изменение товаров, не подтверждено.
- Независимой статистики долей рынка POS в РФ по числу кафе, кофеен и кальянных (в процентах) не найдено. Есть только выручка iiko (TAdviser) и маркетинговые счётчики заведений. Какими POS пользуются кальянные, не исследовано (лимит поиска).
