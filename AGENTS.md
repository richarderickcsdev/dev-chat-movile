# dev-chat-movile — Documentación del Proyecto

## Descripción
Backend de una aplicación de chat móvil en tiempo real. Arquitectura monorepo con `apps/` y `packages/`.

## Tech Stack
- **Runtime:** Node.js + TypeScript 5.4
- **HTTP:** Express 4.19
- **WebSocket:** Socket.IO 4.7
- **Bases de datos:** PostgreSQL (pg 8.11), MongoDB (Mongoose 8.4), Redis (ioredis 5.3)
- **Message Broker:** Kafka (KafkaJS 2.2)
- **Auth:** JWT
- **API Docs:** Swagger (OpenAPI) + REST Client (.http)
- **Infraestructura:** Docker Compose (Postgres 16, Mongo 7, Redis 7, Zookeeper, Kafka 7.5)

## Estructura del Proyecto

```
dev-chat-movile/
├── .env.local                          # Variables de entorno (DBs, JWT, Kafka)
├── .gitignore
├── docker-compose.yml                  # 5 servicios: Postgres, Mongo, Redis, ZK, Kafka
├── opencode.json                        # Configuración de opencode (MCP: Notion, Linear)
├── AGENTS.md                            # Esta documentación
├── apps/
│   ├── api/                             # Backend API (implementado)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nodemon.json
│   │   └── src/
│   │       ├── index.ts                 # Entry point: Express + Socket.IO + Conexiones DB
│   │       ├── config/
│   │       │   ├── env.ts               # Carga .env.local
│   │       │   ├── postgres.ts          # Pool PostgreSQL
│   │       │   ├── mongo.ts             # Conexión Mongoose
│   │       │   ├── redis.ts             # Cliente ioredis
│   │       │   └── kafka.ts             # Cliente KafkaJS
│   │       ├── routes/
│   │       │   └── health.ts            # GET /health (verifica todas las DBs)
│   │       └── socket/
│   │           └── index.ts             # Socket.IO (join_room, leave_room, disconnect)
│   └── mobile/                          # Placeholder app móvil
└── packages/
    └── shared/                          # Placeholder tipos/utils compartidos
```

## Estado Actual
- Fase 1 ✅ — Entorno Local (Docker, .env, estructura, MCP)
- Fase 2 ✅ — Backend Auth & Usuarios (Express, DBs, Auth OTP, Perfiles, Contactos)
- Fase 3 ✅ — Mensajería Real-time (Socket.io, Mensajes, Estados, Conversaciones, Grupos, Typing)
- Fase 4 ✅ — App React Native (Expo, Login, Chats, ChatScreen, Socket client, API client)
- Fase 5 — QA & Seguridad (SIGUIENTE)

## Issues en Linear

### Fase 1 ✅ (Completada)
| Issue | Estado |
|---|---|
| RIC-13 Docker Compose — 5 Servicios | ✅ Done |
| RIC-14 .env.local + Variables de Entorno | ✅ Done |
| RIC-15 Estructura Monorepo (apps/ + packages/) | ✅ Done |
| RIC-16 Integración opencode + MCP (Notion, Linear) | ✅ Done |

### Fase 2 (Siguiente — Todo)
| Issue | Estado |
|---|---|
| RIC-17 Setup Express + TypeScript + Socket.io | 📋 Todo |
| RIC-18 Conexiones a las 3 bases de datos | 📋 Todo |
| RIC-19 Auth con OTP simulado (sin Twilio) | 📋 Todo |
| RIC-20 Gestión de perfiles + Avatares | 📋 Todo |
| RIC-21 Sistema de contactos + Seed | 📋 Todo |

### Fase 3 ✅ (Completada)
| Issue | Estado |
|---|---|
| RIC-22 Servidor Socket.io con auth y rooms | ✅ Done |
| RIC-23 Flujo completo de envío de mensajes | ✅ Done |
| RIC-24 Estados de mensaje (✓ ✓✓ ✓✓🔵) | ✅ Done |
| RIC-25 API de conversaciones | ✅ Done |
| RIC-26 Grupos básicos | ✅ Done |
| RIC-27 Typing indicators + Online status | ✅ Done |

### Fase 4 (En progreso)
| Issue | Estado |
|---|---|
| RIC-28 Setup proyecto Expo + Navegación | ✅ Done |
| RIC-29 Flujo de autenticación en mobile | 📋 Todo |
| RIC-30 Lista de conversaciones | 📋 Todo |
| RIC-31 ChatScreen | 📋 Todo |
| RIC-32 Envío de imágenes | 📋 Todo |
| RIC-33 Notificaciones locales (sin Firebase) | 📋 Todo |

### Fase 5 (Backlog)
| Issue | |
|---|---|
| RIC-34 Tests del backend (Jest + Supertest) | 📋 |
| RIC-35 Testing en 2 celulares físicos | 📋 |
| RIC-36 Seguridad básica | 📋 |
| RIC-37 Performance básica | 📋 |

### Fase 6 (Backlog)
| Issue | |
|---|---|
| RIC-38 Beta con Expo Go (testers) | 📋 |
| RIC-39 Build APK Android + Play Store | 📋 |
| RIC-40 Ruta de escalado gradual | 📋 |

## Testing de la API
- **Swagger UI:** `http://localhost:3001/api-docs` (cuando el servidor corre)
- **REST Client:** Abrir `apps/api/api.http` en VS Code con la extension `humao.rest-client`
- **Socket.IO:** Cliente conecta a `http://localhost:3001` con `{ auth: { token } }`

## Mobile App (Expo)
- `cd apps/mobile && npx expo start` — escanear QR con Expo Go
- `BASE_URL` configurado en `src/api/client.ts` (IP local del PC)

## Conexiones Externas (MCP)
- **Notion:** Documentación del proyecto en Notion (página "Proyecto Chat Movile")
- **Linear:** Issues y seguimiento de tareas (RIC-13 a RIC-40)
