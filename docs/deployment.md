# Production deployment

IANep v1 рассчитан на один Node.js process/server за доверенным HTTPS reverse proxy: `reverse proxy → Next.js → PostgreSQL + private persistent filesystem`. Несколько application instances и общий rate limiter в эту схему не входят.

## Требования

- Node.js 24 LTS (см. `.node-version`) и npm 11; `npm ci` является стандартным способом установки. При production-only установке допустим `npm ci --omit=dev`: runtime-зависимости maintenance-команд сохраняются.
- Persistent PostgreSQL с отдельным production database/user.
- Абсолютный persistent `IANEP_STORAGE_DIR`, не внутри `public/`, с правами read/write только для пользователя приложения. Каталог необходимо создать до запуска.
- Reverse proxy завершает TLS, ограничивает body, задаёт timeouts и **перезаписывает**, а не дополняет, выбранный client-IP header.

## Production environment

Обязательные переменные: `NODE_ENV=production`, `DATABASE_URL`, `ADMIN_SESSION_SECRET` (не менее 32 случайных символов), `PRIVACY_LOOKUP_SECRET` (отдельный случайный секрет не менее 32 байт), `APP_BASE_URL` (абсолютный HTTPS URL), `CORS_ALLOWED_ORIGINS` (HTTPS origins через запятую, включая origin приложения) и абсолютный `IANEP_STORAGE_DIR`.

`PRIVACY_LOOKUP_SECRET` используется только как ключ HMAC-SHA256 для служебного псевдонимного сопоставления email и телефона с ранее исполненными запросами. HMAC не считается анонимными данными. Lookup и подтверждающие сведения хранятся три года с фактического исполнения (`completedAt`), после чего автоматически очищаются. Секрет должен отличаться от `ADMIN_SESSION_SECRET`, храниться в секрет-хранилище окружения и быть одинаковым на всех instances. Не меняйте его в течение действующего срока хранения без заранее подготовленного плана ротации: старые lookup-идентификаторы перестанут находиться. Приложение не выводит значение секрета в UI или логи и в production прекращает запуск при его отсутствии или небезопасной длине.

Для IP rate limit: `TRUST_PROXY_HEADERS=true` разрешается только когда приложение недоступно в обход proxy, а proxy перезаписывает `CLIENT_IP_HEADER`. Допустимые значения заголовка: `x-real-ip` или `x-forwarded-for`. При `TRUST_PROXY_HEADERS=false` forwarded headers игнорируются; это безопасный default, но все прямые запросы разделяют один limiter bucket.

Email включается только явно через `SMTP_ENABLED=true`. Тогда единым набором задаются `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`; `SMTP_USER` и `SMTP_PASS` задаются только вместе. Необязательный `SMTP_FROM_NAME` задаёт отображаемое имя отправителя и по умолчанию равен `IANep`; `SMTP_FROM` при этом остаётся чистым email-адресом. `SMTP_REPLY_TO` необязателен. При `SMTP_ENABLED=false` in-app уведомления работают, email attempts остаются pending и dispatcher ничего не помечает отправленным.

Значения секретов нельзя помещать в логи, unit-файлы, shell history или Git. Startup validation проверяет схему конфигурации и доступность storage до готовности процесса.

## Установка и запуск

```bash
npm ci
npm run db:generate
npx prisma migrate status
npx prisma migrate deploy
npm run admin:upsert
npm run build
npm start
```

`admin:upsert` использует существующие bootstrap variables/процедуру проекта. Выполняйте его из защищённой deploy-сессии. После запуска `GET /api/health` должен вернуть HTTP 200 и только статусы `app`, `database`, `storage`. HTTP 503 означает, что instance не готов принимать трафик.

## Reverse proxy

- Только HTTPS с редиректом HTTP → HTTPS.
- Не давать прямого публичного доступа к порту Next.js.
- Перезаписывать `X-Real-IP` либо формировать чистый `X-Forwarded-For`; затем согласовать `CLIENT_IP_HEADER`.
- Ограничить public Brief request body на proxy уровне до 64 KiB. Приложение независимо применяет тот же streaming limit.
- Ограничить upload body минимум действующим application limit (20 MiB плюс небольшой protocol overhead) и установить разумные read/send timeouts.
- Передавать/создавать `X-Request-ID`; приложение валидирует его и создаёт UUID при отсутствии.

In-memory rate limit предназначен только для single-process v1 и сбрасывается при рестарте. Переход на несколько instances требует общего limiter store.

## Notification dispatcher

Запускайте отдельную команду каждую минуту через systemd timer, cron или process manager:

```bash
npm run notifications:dispatch
```

Не допускайте перекрывающихся долгих запусков. Dispatcher атомарно резервирует попытку, повторяет временные SMTP failures с ограниченным exponential backoff и не откатывает бизнес-операцию. Он не выставляет `DELIVERED` или `READ`: успешная SMTP-передача фиксируется как `SENT`. Перед production-release выполните staging smoke для text/HTML, ссылок, From/Reply-To и DNS SPF/DKIM/DMARC.

## Backup и restore

PostgreSQL dump и снимок `IANEP_STORAGE_DIR` образуют **единый recovery set**. На время согласованного backup обеспечьте одну точку согласованности (короткое maintenance window либо документированная snapshot-процедура), пометьте обе части общим timestamp/release id и храните зашифрованно.

Restore drill выполняйте регулярно на отдельной БД и отдельном временном storage: восстановите обе части одного набора, примените только ожидаемые migrations, запустите health и smoke private-file/ownership. Никогда не проверяйте destructive restore на рабочей БД.

Автоматическая cleanup storage в первом релизе остаётся `OFF`. Preview и ручная контролируемая очистка выполняются существующими lifecycle-инструментами после отдельной проверки кандидатов.

Privacy receipt cleanup является обязательной автоматической retention-операцией и не зависит от флага очистки storage. Команда `npm run projects:cleanup` транзакционно очищает истёкшие privacy-квитанции, затем только показывает кандидатов storage без их удаления. Запускайте её существующим maintenance timer не реже одного раза в сутки. Повторный запуск безопасен. После очистки остаются только технический tombstone записи (внутренний id, публичный номер, статус и дата очистки) и агрегированное системное событие без контакта, HMAC, номера запроса, subject/project/brief/client id.

После изменения dependency graph выполните чистый `npm ci --omit=dev`, затем запустите `npm run verify:production-install`. Проверка подтверждает, что lockfile и установленный production dependency graph содержат рабочий TypeScript loader, используемый maintenance entrypoint.

## Staging validation

На disposable PostgreSQL и отдельном storage выполните:

```bash
export DATABASE_URL='postgresql://.../ianep_release_test'
export IANEP_STORAGE_DIR='/absolute/disposable/ianep-storage'
npx prisma migrate deploy
npx prisma migrate status
npm run admin:upsert
npm run test:integration
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Убедитесь, что URL/credentials указывают именно на disposable окружение до запуска integration suite. Рабочую БД для destructive tests использовать нельзя.

## Rollback и неудачная migration

1. Остановить приём нового трафика и сохранить DB + storage recovery set.
2. Проверить `npx prisma migrate status` и журнал конкретной migration.
3. Если migration частично упала, исправить причину; только после ручной проверки использовать `npx prisma migrate resolve --rolled-back <migration>` или `--applied <migration>`. Не отмечать migration вслепую.
4. Для code-only rollback вернуть предыдущий проверенный artifact и повторно проверить health. Если схема несовместима, восстановить **оба** компонента единого backup set; не пытаться откатывать production schema импровизированным SQL.
5. После восстановления выполнить login, Brief, ownership/private-file и notification smoke tests.
