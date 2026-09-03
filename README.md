# IANep

Локальная разработка Public MVP на Next.js, TypeScript, Prisma и PostgreSQL.

## Запуск

1. Создайте `.env.local` по примеру `.env.example`.
2. Запустите PostgreSQL:

```bash
docker compose --env-file .env.local up -d --wait
```

3. Примените миграции и создайте Prisma Client:

```bash
npx prisma migrate dev
npm run db:generate
```

4. Запустите приложение:

```bash
npm run dev
```

Приложение откроется по адресу [http://localhost:3000](http://localhost:3000).

## Проверки

```bash
npm run lint
npm run build
npm run test:integration
```

## Обязательные дизайн-референсы

Перед любыми визуальными изменениями рабочий чат обязан изучить [`references/README.md`](references/README.md) и соответствующий утверждённый файл из `references/approved/`. Отсутствующие референсы нельзя реконструировать или заменять похожими изображениями.

## Brief API

`POST /api/brief` принимает имя, контакт, тип проекта и ответы Brief. Заявка и событие аудита сохраняются одной транзакцией.

Все восемь шагов работают в существующей секции главной. Восстановленные вопросы и оставшиеся OPEN-варианты записаны в `references/content/SITE_CONTENT_V1.md`. Ответы сохраняются при переходах и ошибках; перезагрузка страницы сбрасывает черновик.

API принимает только `name`, `contact`, `projectType`, `answers`. Тип проекта — стабильный id из `brief.data.ts`. В `answers`: массивы `goals`, `features`, `designStyles`, `materials`; строки `description`, `productCount`, `website`, `featureNotes`, `designReference`, `designNotes`, `readiness`, `timeframe`, `launchDate`, `budget`, `contactMethod`, `comment`; `consent: true`. Для незаполненных необязательных строк передаётся пустая строка. Полный синтетический пример: `src/server/brief/brief.test-fixture.ts`.

Общая клиентская и серверная проверка: `src/server/brief/brief.schema.ts`. Неизвестные поля отклоняются. Статус `NEW` и источник `PUBLIC_BRIEF` назначает сервер. Metadata события `BRIEF_CREATED` содержит источник и SHA-256 отпечаток квитанции; контакт и сама квитанция в аудит не попадают.

Ответы:

- `201` (создание) / `200` (замена): `{ "data": { "id": "uuid", "number": "IAN-000123", "receipt": "64 hex символа", "replaced": false, "status": "NEW", "createdAt": "ISO-8601" } }`; при замене `replaced: true`;
- `409`: `{ "error": { "code": "DUPLICATE_BRIEF", "number": "IAN-000123", "canReplace": true, "message": "..." } }`; при недоступной замене — `REPLACEMENT_UNAVAILABLE`;
- `400`: `{ "error": { "code": "INVALID_JSON", "message": "..." } }`;
- `422`: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "issues": [{ "path": ["answers", "goals"], "message": "..." }] } }`;
- `500`: `{ "error": { "code": "INTERNAL_ERROR", "message": "..." } }`.

`npm run test:integration` проверяет схему, API, реальную запись и откат транзакции при ошибке аудита. Синтетические записи удаляются после проверки. Дополнительно: `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`.

### Повторная отправка

UI хранит квитанцию последней отправки в `sessionStorage` текущей вкладки и передаёт её заголовком `x-brief-receipt`. При совпадении нормализованного контакта и способа связи сервер возвращает `409`; диалог предлагает заменить предыдущую заявку или создать новую. Выбор передаётся заголовком `x-brief-action: replace` или `new`. Без квитанции нельзя заменить заявку по одному лишь контакту. После закрытия вкладки автоматическое распознавание предыдущей заявки не гарантируется.

Замена доступна только для `NEW` с источником `PUBLIC_BRIEF`, сохраняет UUID и публичный номер, обновляет ответы и создаёт `BRIEF_UPDATED` в одной транзакции. Проверка `updatedAt` защищает от одновременного изменения. Уже обрабатываемую заявку можно только дополнить новой. Секретную квитанцию нельзя публиковать или включать в логи.

Миграция `20260903160000_brief_public_number` добавляет уникальный последовательный `public_number`; внутренний UUID сохраняется. Отображение: `IAN-000123`. Пропуски в последовательности после отката транзакции или удаления тестовых данных допустимы. После генерации нового Prisma Client работающий dev-сервер нужно перезапустить.

Календарь реализован в `BriefDatePicker.tsx`: выбор месяца и года, стрелки клавиатуры, Escape, возврат фокуса. Экран успеха позволяет начать новый бриф. Персонаж: `public/images/brief/mascot-success-v2.png`, PNG с прозрачностью; описание генерации — `references/content/BRIEF_SUCCESS_ASSET.md`.
