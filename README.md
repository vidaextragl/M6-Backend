# Vida Extra — Backend

## 📖 Descripción

Backend de **Vida Extra: Tu Billetera Gamer**, una fintech pensada para gamers y E-Sports: billetera
virtual multi-moneda, compra/venta y swap de divisas, cashback y canje de recompensas gamer,
notificaciones de comprobante por email y chatbot de consulta. Este repositorio implementa la API
REST (Express + TypeScript + PostgreSQL) que consume el frontend del proyecto.

Proyecto Final del curso Full Stack de Henry. Backend developer: Ciro Castellaro.

## Backend Deployado

- https://m6-backend-production.up.railway.app

## 🚀 Tecnologías

- **Node.js** + **Express 5**
- **TypeScript**
- **PostgreSQL** (`pg` + `node-pg-migrate` para migraciones)
- **JWT** (`jsonwebtoken`) + **bcrypt** para autenticación
- **Zod** para validación de esquemas
- **AWS SES** (`@aws-sdk/client-ses`) para el envío de emails transaccionales
- **Google Gemini** (`@google/genai`) para el chatbot con function calling
- **ESLint** + **Prettier** para linting y formateo
- **GitHub Actions** para CI (lint + build)
- Deploy en **Railway**

## 📦 Instalación

```bash
git clone https://github.com/vidaextragl/M6-Backend.git
cd M6-Backend
npm install
```

1. Copiar el archivo de variables de entorno y completar los valores reales:
   ```bash
   cp .env.example .env
   ```
2. Tener PostgreSQL corriendo localmente (o apuntar `DATABASE_URL` a una instancia remota) y crear la
   base de datos indicada en la URL.
3. Correr las migraciones:
   ```bash
   npm run migrate:up
   ```
4. (Opcional) Cargar el usuario demo para pruebas:
   ```bash
   npm run seed:demo
   ```

## ⚙️ Variables de entorno

| Variable                          | Descripción                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| `PORT`                            | Puerto en el que levanta el servidor Express                         |
| `NODE_ENV`                        | Entorno de ejecución (`development` / `production`)                  |
| `DATABASE_URL`                    | Cadena de conexión a PostgreSQL                                      |
| `JWT_SECRET`                      | Secreto usado para firmar/verificar los JWT                          |
| `JWT_EXPIRES_IN`                  | Tiempo de expiración del JWT (ej. `1h`)                              |
| `EXCHANGE_RATE_API_KEY`           | API key del proveedor ExchangeRate-API (Plan B de tasas de cambio)   |
| `CURRENCY_FREAKS_API_KEY`         | API key del proveedor CurrencyFreaks (Plan C de tasas de cambio)     |
| `EXCHANGE_RATE_CACHE_TTL_MINUTES` | TTL en minutos del caché local de tasas de cambio                    |
| `AWS_REGION`                      | Región de AWS donde está configurado SES (ej. `us-east-1`)           |
| `AWS_ACCESS_KEY_ID`               | Access Key ID del usuario IAM con permisos de SES                    |
| `AWS_SECRET_ACCESS_KEY`           | Secret Access Key del mismo usuario IAM                              |
| `SES_FROM_EMAIL`                  | Dirección remitente verificada en SES para los emails de comprobante |
| `GEMINI_API_KEY`                  | API key de Google Gemini para el chatbot                             |

> Los valores reales viven en el `.env` local de cada desarrollador y en las variables de entorno de
> Railway — nunca se commitean ni se muestran completos en el chat.

## 🖥️ Uso

Scripts disponibles (`package.json`):

| Script                                        | Descripción                                                      |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                                 | Levanta el servidor en modo desarrollo con recarga (`tsx watch`) |
| `npm run build`                               | Compila TypeScript a `dist/`                                     |
| `npm run start`                               | Corre el servidor compilado (`dist/server.js`)                   |
| `npm run lint` / `npm run lint:fix`           | Corre ESLint / lo corre y aplica fixes automáticos               |
| `npm run format` / `npm run format:check`     | Formatea con Prettier / solo verifica el formato                 |
| `npm run migrate:up` / `npm run migrate:down` | Aplica / revierte migraciones de PostgreSQL                      |
| `npm run migrate:create`                      | Crea un nuevo archivo de migración                               |
| `npm run seed:demo`                           | Carga el usuario demo (`demo@vidaextra.com`) para presentaciones |

## 📂 Estructura del proyecto

```
src/
├── app.ts                     # Configuración de Express (middlewares, montaje de rutas)
├── server.ts                  # Punto de entrada, levanta el servidor HTTP
├── config/                    # Variables de entorno tipadas
├── database/                  # Cliente de PostgreSQL, migraciones y seeds
├── middlewares/                # Manejo de errores, validación de body/query con Zod
├── modules/
│   ├── auth/                  # Registro, login, JWT, middleware de autenticación
│   ├── users/                 # Perfil del usuario autenticado
│   ├── wallets/                # Wallet, balances por moneda, depósito/retiro
│   ├── balances/               # Acceso a balances por moneda dentro de una wallet
│   ├── transactions/            # Ledger de partida doble e historial con filtros
│   ├── exchange-rates/          # Tasas de cambio con fallback en cascada (Frankfurter → ExchangeRate-API → CurrencyFreaks) y caché
│   ├── swaps/                  # Swap entre monedas y compras (BUY) con cashback asociado
│   ├── rewards/                # Cashback, catálogo de recompensas y canje
│   ├── notifications/
│   │   └── email/               # Cliente SES, servicio de envío y templates de comprobantes
│   └── chatbot/                # Chatbot con Gemini: function calling, system prompt, sanitización
├── shared/                    # Errores tipados, constantes (monedas soportadas), utils
└── types/                     # Tipos globales (ej. `req.user` de Express)
```

## 🔌 API

Todas las rutas (salvo `/health`, `/auth/*`, `GET /currencies` y `GET /exchange-rates`) requieren
header `Authorization: Bearer <token>`. Los errores tienen la forma `{ "error": string, "code": string }`.

| Método | Ruta                | Auth | Descripción                                                                                                            |
| ------ | ------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`           | No   | Health check                                                                                                           |
| POST   | `/auth/register`    | No   | Registro (`email`, `name`, `password`) — crea usuario + wallet                                                         |
| POST   | `/auth/login`       | No   | Login (`email`, `password`) — devuelve `{ user, token }`                                                               |
| GET    | `/users/me`         | Sí   | Perfil del usuario autenticado                                                                                         |
| PATCH  | `/users/me`         | Sí   | Actualiza `name` y/o `avatarUrl`                                                                                       |
| GET    | `/wallet`           | Sí   | Wallet y balances por moneda                                                                                           |
| GET    | `/wallet/summary`   | Sí   | Resumen de la wallet                                                                                                   |
| POST   | `/wallet/deposit`   | Sí   | Deposita (`currency`, `amount`) — dispara email de comprobante                                                         |
| POST   | `/wallet/withdraw`  | Sí   | Retira (`currency`, `amount`) — dispara email de comprobante                                                           |
| GET    | `/currencies`       | No   | Lista de monedas soportadas (`USD`, `EUR`, `ARS`, `CLP`, `COP`, `BRL`)                                                 |
| GET    | `/transactions`     | Sí   | Historial paginado, filtrable por `type`, `currency`, `status`, `from`, `to`                                           |
| GET    | `/exchange-rates`   | No   | Tasa de cambio entre `from` y `to` (query params)                                                                      |
| POST   | `/exchange/swap`    | Sí   | Swap entre monedas (`fromCurrency`, `toCurrency`, `amountToReceive`) — dispara email de comprobante                    |
| POST   | `/exchange/buy`     | Sí   | Compra (`currency`, `amount`), acredita cashback automático — dispara email de comprobante de la compra y del cashback |
| GET    | `/rewards`          | Sí   | Puntos disponibles y catálogo de recompensas                                                                           |
| POST   | `/rewards/redeem`   | Sí   | Canjea una recompensa (`catalogItemId`) — dispara email de comprobante                                                 |
| GET    | `/cashback`         | Sí   | Historial de cashback                                                                                                  |
| GET    | `/cashback/summary` | Sí   | Resumen mensual de cashback (meta, progreso)                                                                           |
| POST   | `/chatbot`          | Sí   | Consulta al chatbot en lenguaje natural (`message`), devuelve `{ reply }`                                              |

### 🤖 Chatbot

`POST /chatbot` (`{ "message": "..." }`) responde consultas sobre la wallet del usuario usando
**Gemini con function calling**. El modelo puede llamar 4 funciones de solo lectura
(`get_balances`, `get_transaction_history`, `get_exchange_rate`, `get_rewards_summary`), todas
ejecutadas del lado del backend con el `userId` que sale del JWT ya verificado — el modelo nunca
puede pedir datos de otro usuario ni tocar la base de datos directamente. Es puramente consultivo:
si se le pide ejecutar una transacción (depósito, swap, canje, etc.), la rechaza y redirige a la
interfaz de la app.

Protecciones anti prompt-injection: system prompt rígido (no modificable por el mensaje del
usuario), un filtro de palabras clave sospechosas que rechaza el mensaje con `400
PROMPT_INJECTION_DETECTED` antes de llamar al modelo, y límite de 500 caracteres por mensaje.

> La propuesta original pide el modelo `gemini-2.5-flash`, pero esa familia de modelos está
> deprecada para API keys nuevas (la API devuelve 404 y sugiere el reemplazo directo). Se usa
> `gemini-3.6-flash` en su lugar — desviación documentada en `BACKEND SPRINT 2.md`.
>
> Las llamadas a Gemini reintentan automáticamente hasta 3 veces con backoff exponencial
> (500ms/1s/2s) ante un `503` de alta demanda, que es un error transitorio conocido y frecuente del
> lado de Google, no algo puntual de este proyecto.

### 📧 Notificaciones por email

Los depósitos, retiros, swaps, compras (incluyendo el cashback que generan) y canjes de recompensas
envían un email de comprobante al usuario vía **AWS SES** (`src/modules/notifications/email/`). El
envío es asincrónico respecto a la respuesta HTTP: si SES falla (por ejemplo, la cuenta sigue en modo
sandbox y el destinatario no está verificado), el error se loguea pero **no** afecta la operación de
dinero, que ya quedó confirmada en la base de datos.

> La cuenta de SES usada en este proyecto está en **modo sandbox**: solo se pueden enviar emails a
> direcciones verificadas manualmente en la consola de AWS.

## 🧪 Pruebas

La carpeta `tests/` está scaffoldeada (`unit/`, `integration/`, `mocks/`) pero **todavía no tiene
tests implementados** ni Vitest agregado como dependencia. Queda pendiente: mínimo 10 tests entre
unitarios e integración para la Demo Final.

CI (`.github/workflows/ci.yml`) corre en cada push/PR a `main` y `develop`: `npm run lint` y
`npm run build`.

## 🚢 Deployment

Desplegado en **Railway** (proyecto `peaceful-celebration`, servicio `M6-Backend` + PostgreSQL en el
mismo proyecto). Build con Nixpacks (`npm run build`), arranque con `npm run start`
(`railway.json`). Las migraciones y seeds contra la base de producción se corren vía túnel SSH
(`railway connect Postgres --tunnel-only`), ya que el `DATABASE_URL` interno de Railway no resuelve
desde una máquina local.

## 👥 Equipo

- **Elizondo Juan** — Full Stack
- **Ciro Castellaro** — Backend
- **Dalila Lariza** — Frontend

## 📄 Licencia

ISC (según `package.json`).
