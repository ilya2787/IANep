# Brief — результат 03.09.2026

## Поток

Существующий Brief UI → общая Zod-проверка на клиенте → POST /api/brief → обязательная серверная Zod-проверка → BriefService → BriefRepository → Prisma transaction → PostgreSQL: BriefRequest и AuditEvent → ответ UI.

Все восемь шагов подключены: тип проекта, задача, функциональность, дизайн, материалы, сроки и дата, бюджет, контакты и согласие. Варианты зависят от типа проекта. Список и источники — `content/SITE_CONTENT_V1.md`.

OPEN: дополнительные направления дизайна и подробные списки функций для web-приложения, доработки, поддержки и неопределённого типа; для них сохранён ввод описания. Юридическая редакция согласия и страница политики остаются OPEN.

## Интерфейс

Оформление выбора и календаря обновлено с применением design-taste-frontend. Календарь поддерживает выбор месяца/года, клавиатуру и возврат фокуса. Экран успеха содержит подтверждение, короткий номер, прозрачного персонажа и повторное заполнение. Предупреждение об отсутствии автоматического принятия проекта сохранено.

Совпадение контакта с предыдущей заявкой текущей вкладки вызывает диалог замены или новой заявки. Право замены подтверждается секретной квитанцией, а не знанием контакта. Замена разрешена только в статусе NEW. Квитанция хранится в sessionStorage; распознавание между разными вкладками/устройствами не реализовано.

## Данные и API

К BriefRequest добавлен уникальный public_number, внутренний UUID сохранён. Аддитивная миграция: `prisma/migrations/20260903160000_brief_public_number/migration.sql`. Статус NEW, источник PUBLIC_BRIEF назначаются сервером. Создание и BRIEF_CREATED атомарны; замена и BRIEF_UPDATED также атомарны. Metadata не содержит контакт; квитанция хранится только в виде SHA-256 отпечатка.

Тело: name, contact, projectType, answers. Ответ успеха: data с id, number, receipt, replaced, status, createdAt. 201 — создано; 200 — заменено; 409 — нужен выбор или замена недоступна; 400 — неверный JSON; 422 — невалидные данные; 500 — безопасное сообщение без деталей БД. Полный контракт и заголовки повторной отправки — в README.md.

## Проверка

13 тестов проходят: схема, route/service/repository, реальные записи, откат создания и замены при ошибке аудита, нормализация контакта, конфликт повторной отправки, запрет замены без корректной квитанции или с другим контактом, запрет замены обрабатываемой заявки. Prisma validate, TypeScript, lint и production build проходят.

В браузере пройдены все шаги, ошибка/сохранение ответов, блокировка повторной отправки во время pending, успех, повторное заполнение, оба решения диалога, клавиатура календаря, светлая/тёмная темы, мобильный экран и reduced-motion.

Пример реальной синтетической записи: IAN-000016, NEW, landing-page; события BRIEF_CREATED и BRIEF_UPDATED. Замена сохранила номер и UUID; новая заявка получила IAN-000017 и отдельный BRIEF_CREATED. Четыре браузерные тестовые заявки и шесть их событий удалены после проверки; последовательность номеров не сбрасывалась.

## Файлы реализации

- src/components/sections/Brief.tsx
- src/components/sections/Brief.module.css
- src/components/sections/BriefDatePicker.tsx
- src/components/sections/brief.data.ts
- src/server/brief/brief.schema.ts
- src/server/brief/brief.receipt.ts
- src/server/brief/brief.service.ts
- src/server/brief/brief.repository.ts
- src/app/api/brief/route.ts
- src/server/brief/brief.schema.test.ts
- src/server/brief/brief.service.integration.test.ts
- src/server/brief/brief.test-fixture.ts
- src/app/api/brief/route.integration.test.ts
- prisma/schema.prisma и миграция public_number
- src/generated/prisma — обновлённый Prisma Client
- public/images/brief/mascot-success-v2.png
- package.json / package-lock.json — существующая настройка тестов этапа Brief
- README.md, references/content/SITE_CONTENT_V1.md, references/content/BRIEF_SUCCESS_ASSET.md

Скриншоты: output/playwright/brief-polished-success-light.png, brief-polished-success-dark.png, brief-polished-success-mobile.png, brief-calendar-light.png, brief-calendar-months-light.png, brief-calendar-mobile-dark.png, brief-duplicate-light.png.
