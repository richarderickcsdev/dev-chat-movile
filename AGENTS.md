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
- Fase 2 — Backend Auth & Usuarios (SIGUIENTE)
- Sin commits realizados

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

### Fase 3 (Backlog)
| Issue | |
|---|---|
| RIC-22 Servidor Socket.io con auth y rooms | 📋 |
| RIC-23 Flujo completo de envío de mensajes | 📋 |
| RIC-24 Estados de mensaje (✓ ✓✓ ✓✓🔵) | 📋 |
| RIC-25 API de conversaciones | 📋 |
| RIC-26 Grupos básicos | 📋 |
| RIC-27 Typing indicators + Online status | 📋 |

### Fase 4 (Backlog)
| Issue | |
|---|---|
| RIC-28 Setup proyecto Expo + Navegación | 📋 |
| RIC-29 Flujo de autenticación en mobile | 📋 |
| RIC-30 Lista de conversaciones | 📋 |
| RIC-31 ChatScreen | 📋 |
| RIC-32 Envío de imágenes | 📋 |
| RIC-33 Notificaciones locales (sin Firebase) | 📋 |

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

## Conexiones Externas (MCP)
- **Notion:** Documentación del proyecto en Notion (página "Proyecto Chat Movile")
- **Linear:** Issues y seguimiento de tareas (RIC-13 a RIC-40)
