# Shadowrun Matrix Backend

Backend API для LARP-игры "Матрица" на базе NestJS, Prisma, PostgreSQL и WebSocket.

## 🚀 Быстрый старт

### Требования

- Node.js 20+
- pnpm 9+
- Docker и Docker Compose (для PostgreSQL)

### Установка и запуск

1. **Установка зависимостей:**
   ```bash
   pnpm i
   ```

2. **Запуск PostgreSQL:**
   ```bash
   docker compose up -d
   ```

3. **Настройка переменных окружения:**
   ```bash
   cp .env.example apps/api/.env
   # Отредактируйте apps/api/.env при необходимости
   ```

4. **Миграции базы данных:**
   ```bash
   pnpm db:migrate
   ```

5. **Заполнение тестовыми данными:**
   ```bash
   pnpm db:seed
   ```

6. **Запуск сервера:**
   ```bash
   pnpm dev
   ```

Сервер будет доступен на `http://localhost:3000`
Swagger документация: `http://localhost:3000/api`

## 📋 Тестовые учётные записи

После выполнения `pnpm db:seed` будут созданы следующие аккаунты:

| Username | Password | Role   | Описание           |
|----------|----------|--------|--------------------|
| gridgod  | gridgod  | GRIDGOD| Администратор Grid|
| decker   | decker   | DECKER | Декер              |
| spider   | spider   | SPIDER | Паук               |
| user     | user     | USER   | Обычный пользователь|

## 🔧 Переменные окружения

Создайте файл `apps/api/.env` на основе `.env.example`:

```env
# Database
DATABASE_URL="postgresql://shadowrun:shadowrun@localhost:5432/shadowrun?schema=public"
# Для SQLite: DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:5173"

# Features
ENABLE_REGISTER=true
ALLOW_IMPERSONATION_HEADER=false
```

## 📚 API Документация

После запуска сервера Swagger UI доступен по адресу:
- **http://localhost:3000/api**

### Основные эндпоинты:

#### Auth
- `POST /auth/login` - Вход в систему
- `POST /auth/register` - Регистрация (если `ENABLE_REGISTER=true`)

#### Persona
- `GET /persona/me` - Информация о своей персоне
- `PATCH /persona/me` - Обновить информацию
- `POST /persona/public/toggle` - Переключить публичность LLS
- `POST /persona/qr/sin` - Создать QR-код SIN
- `GET /persona/:id/public` - Публичная информация о персоне
- `GET /persona/me/blog` - Свой блог
- `POST /persona/me/blog` - Создать пост в блоге
- `GET /persona/:id/blog` - Блог персоны
- `GET /persona/me/files` - Свои файлы
- `POST /persona/me/files/redeem` - Активировать файл по коду
- `POST /persona/me/files/:fileId/public/toggle` - Переключить публичность файла

#### Devices
- `GET /devices` - Список устройств
- `POST /devices/bind` - Привязать устройство
- `POST /devices/unbind` - Отвязать устройство
- `POST /devices/:deviceId/brick` - Заблокировать устройство (DECKER)

#### Grid
- `GET /grid/public-hosts` - Публичные хосты
- `GET /grid/public-personas` - Публичные персоны

#### Hosts
- `GET /hosts/public/:id` - Публичная информация о хосте
- `GET /hosts/:id` - Информация о хосте (владелец/паук/декер)
- `POST /hosts/:id/files/:fileId/public/toggle` - Переключить публичность файла
- `POST /hosts/:id/open-archive` - Открыть архив
- `GET /hosts/:id/qr` - QR-код для платежа

#### Bank
- `GET /bank/balance` - Баланс
- `GET /bank/transactions` - История транзакций
- `POST /bank/transfer` - Перевод средств
- `POST /bank/payment-request` - Создать запрос на оплату
- `POST /bank/scan-qr` - Сканировать QR-код
- `POST /bank/confirm-payment` - Подтвердить оплату
- `POST /bank/subscriptions/new` - Создать подписку/зарплату
- `GET /bank/subscriptions` - Список подписок

#### Messenger
- `GET /messenger/chats` - Список чатов
- `GET /messenger/chat/:targetType/:targetId` - Сообщения чата
- `POST /messenger/send` - Отправить сообщение

#### Decking (DECKER)
- `GET /decking/known-targets` - Известные цели
- `POST /decking/add-target` - Добавить цель
- `GET /decking/random` - Случайная неизвестная цель
- `POST /decking/hack/start` - Начать взлом
- `POST /decking/hack/:sessionId/complete` - Завершить взлом
- `POST /decking/hack/:sessionId/cancel` - Отменить взлом
- `POST /decking/op/steal-sin` - Украсть SIN
- `POST /decking/op/transfer-funds` - Перевести 10% средств
- `POST /decking/op/brick-device` - Заблокировать устройство
- `POST /decking/op/download-file` - Скачать файл

#### Spider (SPIDER)
- `GET /spider/hosts` - Хосты где я паук
- `POST /spider/counter/start` - Начать контр-взлом
- `POST /spider/counter/:counterSessionId/complete` - Завершить контр-взлом

#### Gridgod (GRIDGOD)
- `GET /grid/logs` - Логи Grid
- `POST /grid/subscriptions/:id/cancel` - Отменить подписку
- `POST /grid/licenses/issue` - Выдать лицензии

#### Notifications
- `GET /notifications` - Получить уведомления

## 🔌 WebSocket

WebSocket подключение через Socket.IO:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// События от сервера:
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

socket.on('bank:balanceUpdated', (data) => {
  console.log('Balance updated:', data.balance);
});

socket.on('bank:transactionCreated', (data) => {
  console.log('Transaction created:', data.tx);
});

socket.on('spider:alert', (data) => {
  console.log('Spider alert:', data);
});

socket.on('grid:log', (data) => {
  console.log('Grid log:', data.logEntry);
});
```

## ⚙️ Фоновые задачи

Система автоматически выполняет следующие задачи каждую минуту:

1. **Expire Hack Sessions** - Истекают активные сессии взлома
2. **Unbrick Devices** - Разблокировка устройств после истечения времени
3. **Process Subscriptions** - Обработка подписок и зарплат:
   - Перевод средств каждые 3600 секунд (1 час)
   - Уведомления при отрицательном балансе плательщика
   - Блокировка исходящих переводов при отрицательном балансе

## 🗄️ База данных

### Использование SQLite (для разработки)

Измените `DATABASE_URL` в `.env`:
```env
DATABASE_URL="file:./dev.db"
```

И обновите `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### Миграции

```bash
# Создать новую миграцию
pnpm db:migrate

# Откатить последнюю миграцию
cd apps/api && pnpm prisma migrate reset

# Просмотр базы данных
pnpm db:studio
```

## 🧪 Тестирование

После запуска seed данных:

1. **Привязка устройства:**
   - Логин как `user/user`
   - `POST /devices/bind` с `{ "code": "DEVICE-001" }`

2. **Перевод средств:**
   - `POST /bank/transfer` с данными получателя

3. **Взлом (decker):**
   - Логин как `decker/decker`
   - `POST /decking/hack/start` для начала взлома
   - `POST /decking/hack/:sessionId/complete` с `{ "success": true }`
   - Выполнить операцию (steal-sin, transfer-funds, etc.)

4. **Контр-взлом (spider):**
   - Логин как `spider/spider`
   - При взломе хоста получит уведомление через WebSocket
   - `POST /spider/counter/start` и `POST /spider/counter/:id/complete`

5. **Gridgod:**
   - Логин как `gridgod/gridgod`
   - `GET /grid/logs` для просмотра всех логов
   - `POST /grid/licenses/issue` для выдачи лицензий

## 📝 Структура проекта

```
apps/api/
├── src/
│   ├── main.ts                 # Точка входа
│   ├── app.module.ts           # Корневой модуль
│   ├── modules/                # Модули приложения
│   │   ├── auth/               # Аутентификация
│   │   ├── persona/            # Персоны
│   │   ├── devices/            # Устройства
│   │   ├── grid/               # Grid (публичные данные)
│   │   ├── hosts/              # Хосты
│   │   ├── bank/               # Банк и транзакции
│   │   ├── messenger/          # Мессенджер
│   │   ├── decking/            # Взлом (decker)
│   │   ├── spider/             # Контр-взлом (spider)
│   │   ├── gridgod/            # Администрирование
│   │   ├── logs/               # Логирование
│   │   ├── notifications/      # Уведомления
│   │   ├── jobs/               # Фоновые задачи
│   │   └── websocket/          # WebSocket gateway
│   └── common/                 # Общие утилиты
│       ├── prisma/             # Prisma service
│       ├── guards/             # Guards
│       ├── decorators/         # Декораторы
│       └── pipes/              # Pipes
├── prisma/
│   ├── schema.prisma           # Схема базы данных
│   └── seed.ts                 # Seed данные
└── package.json
```

## 🔒 Безопасность

- Все эндпоинты (кроме публичных) требуют JWT токен
- Роли проверяются через `RolesGuard`
- Пароли хешируются с помощью bcrypt
- Даты хранятся в UTC, отдаются в ISO формате
- Транзакции с `isTheft=true` скрыты от обычных пользователей

## 🐛 Отладка

```bash
# Просмотр логов базы данных
pnpm db:studio

# Проверка подключения к БД
cd apps/api && pnpm prisma db pull

# Генерация Prisma Client
cd apps/api && pnpm prisma generate
```

## 📄 Лицензия

Проект создан для LARP-игры "Матрица".
