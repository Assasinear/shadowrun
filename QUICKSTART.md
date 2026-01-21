# Быстрый старт

## 1. Установка зависимостей
```bash
pnpm i
```

## 2. Запуск PostgreSQL
```bash
docker compose up -d
```

## 3. Настройка .env
Создайте файл `apps/api/.env`:
```env
DATABASE_URL="postgresql://shadowrun:shadowrun@localhost:5432/shadowrun?schema=public"
JWT_SECRET="your-secret-key"
PORT=3000
ENABLE_REGISTER=true
```

## 4. Миграции и seed
```bash
pnpm db:migrate
pnpm db:seed
```

## 5. Запуск
```bash
pnpm dev
```

## Тестовые аккаунты
- `gridgod/gridgod` (GRIDGOD)
- `decker/decker` (DECKER)
- `spider/spider` (SPIDER)
- `user/user` (USER)

## Swagger
http://localhost:3000/api
