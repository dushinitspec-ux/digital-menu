# Деплой на Railway (закрытый пилот для сети Understone)

Один сервис из `Dockerfile` (панель, плеер и API вместе) и база PostgreSQL. Конфигурация лежит в `railway.json`: сборка из Dockerfile, проверка здоровья `/api/health`, перезапуск при сбое.

## Что получится

- Адрес вида `https://<имя>.up.railway.app`: `/admin/` — панель, `/player/` — экран для ТВ.
- Открытая регистрация выключена (`REGISTRATION=closed`): посторонние по ссылке не зарегистрируются.
- При первом запуске сервер сам создаёт аккаунт сети Understone с тарифом «Бесплатный доступ» (`BOOTSTRAP_*`). Владелец входит с этим e-mail и паролем и меняет пароль в **Настройках**. Сотрудников и точки сети он добавляет сам: **Команда** и **Точки**.
- Оплаты нет: биллинг ещё не подключён, а у аккаунта Understone тариф `complimentary`, поэтому будущий биллинг его не тронет.

## Шаги в интерфейсе Railway (≈10 минут)

1. **New Project → Deploy from GitHub repo** → выберите `dushinitspec-ux/digital-menu`. Railway попросит доступ к репозиторию — разрешите. В **Settings → Source** укажите ветку `claude/awesome-sagan-fdg74x` (или основную ветку, после слияния).
2. В проекте **+ New → Database → Add PostgreSQL**.
3. В сервисе приложения: **Settings → Networking → Generate Domain**.
4. **+ New → Volume** (или правой кнопкой по сервису → Attach volume), путь монтирования `/data/media`. Здесь хранятся фото и видео меню.
5. **Variables → Raw Editor**, вставьте и подставьте свои значения:

```
REGION=ru
DATABASE_URL=${{Postgres.DATABASE_URL}}
BRAND_NAME=Digital Menu
REGISTRATION=closed
BOOTSTRAP_ORG_NAME=Understone
BOOTSTRAP_OWNER_EMAIL=владелец@understone.ru
BOOTSTRAP_OWNER_PASSWORD=придумайте-пароль-от-8-символов
BOOTSTRAP_OWNER_NAME=Understone
BOOTSTRAP_BUSINESS_TYPE=bar
BOOTSTRAP_TIMEZONE=Europe/Moscow
BOOTSTRAP_PLAN=complimentary
STORAGE_DIR=/data/media
RAILWAY_RUN_UID=0
```

`PUBLIC_URL` задавать не нужно: адрес берётся из домена Railway. `RAILWAY_RUN_UID=0` нужен, потому что том Railway монтируется с правами root. `BOOTSTRAP_BUSINESS_TYPE` — `coffee`, `cafe`, `restaurant`, `bar` или `hookah`: под тип подставляется стартовое демо-меню, которое владелец потом правит.

6. **Deploy**. Когда статус станет **Active**, откройте `https://<домен>/admin/` и войдите как владелец Understone.

## Проверка

- `https://<домен>/api/health` → `{"ok":true,"region":"ru"}`.
- На телевизоре или приставке откройте `https://<домен>/player/`. Появится код, его вводят в панели: **Экраны → Добавить экран**.

## Важно до запуска для заведений в России

Railway — американский облачный провайдер, его регионы находятся в США, ЕС и Азии.

- **152-ФЗ.** Если сеть Understone работает в России, аккаунты её владельца и сотрудников — это персональные данные граждан РФ. С 01.07.2025 их нужно записывать и хранить в базах на территории РФ (ч. 5 ст. 18 152-ФЗ, штраф для юрлица от 1 до 6 млн ₽). Для такого клиента Railway подходит только как короткий технический тест. Боевой контур RU — в Yandex Cloud или Selectel: `docker-compose.yml` и `.env.ru.example`.
- **Оплата и санкции.** Railway платный (тариф Hobby — от $5 в месяц) и принимает карты, а российские карты за рубежом не работают. Кроме того, санкции США ограничивают IT-услуги для лиц в России. Может ли Railway обслуживать проект с российскими клиентами — не подтверждено, это вопрос к юристу (см. раздел о санкциях в отчёте).
- **Регион Railway.** Для сети в Европе выберите **EU West (Amsterdam)** в настройках сервиса и `REGION=eu`.
