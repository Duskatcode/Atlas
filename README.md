# Atlas

Atlas es un bot modular para Discord pensado como una suite de herramientas escalables en lugar de un bot monolítico.

La visión del proyecto es construir un ecosistema compuesto por distintas capacidades, por ejemplo:

- **Atlas Songs**: música y reproducción en canales de voz
- **Atlas Constructor**: creación y configuración de servidores mediante plantillas
- **Atlas Rank**: notificaciones, rangos, eventos y automatizaciones
- futuras extensiones como moderación, utilidades administrativas o integraciones externas

Actualmente el proyecto se encuentra en su fase inicial, con una base técnica funcional para Discord y una estructura preparada para crecer.

---

## Estado actual

### Implementado
- estructura base tipo monorepo
- bot funcional conectado a Discord
- registro de slash commands
- comando `/ping` operativo
- comandos `/join` y `/leave` en proceso de validación
- configuración por variables de entorno
- base preparada para escalar por módulos

### En progreso
- conexión robusta a canales de voz
- validación de permisos por servidor y canal
- preparación de la capa de reproducción para Atlas Songs

---

## Estructura del proyecto

```txt
Atlas/
├── apps/
│   └── atlas-bot/
│       ├── src/
│       │   ├── commands.ts
│       │   ├── config.ts
│       │   ├── deploy-commands.ts
│       │   └── index.ts
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── config/
│   │   └── src/
│   ├── core/
│   │   └── src/
│   └── discord-common/
│       └── src/
├── docs/
│   └── TRAZABILIDAD.md
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json

---

## Requisitos y dependencias

- Node.js 18+ (se recomienda 20 LTS para compatibilidad con Discord.js 14).
- pnpm `10.33.0` (el `packageManager` del monorepo apunta a esta versión).
- Docker / Docker Compose para ejecutar el servicio de Lavalink incluido en `services/lavalink`.
- Cuenta de Discord con permisos para crear bots y registrar comandos en los servidores donde se usará Atlas.

Instala las dependencias del monorepo antes de cualquier acción:

```bash
pnpm install
```

---

## Variables de entorno

Atlas Song valida su configuración mediante `zod` (`apps/atlas-bot/src/config.ts`) y requiere las siguientes variables:

| Variable | Descripción |
| --- | --- |
| `DISCORD_TOKEN` | Token del bot de Discord. |
| `DISCORD_CLIENT_ID` | ID de la aplicación/bot usado para registrar comandos. |
| `DISCORD_GUILD_ID_1` | Primer servidor donde se desplegarán los slash commands. |
| `DISCORD_GUILD_ID_2` | Segundo servidor objetivo (puedes repetir el mismo ID si solo usas uno). |
| `LAVALINK_HOST` | Host del servidor Lavalink, incluyendo protocolo (ej. `http://127.0.0.1`). |
| `LAVALINK_PORT` | Puerto expuesto por Lavalink (por defecto `2333`). |
| `LAVALINK_PASSWORD` | Contraseña configurada en `services/lavalink/application.yml` (por defecto `atlas-dev-pass`). |

Utiliza `apps/atlas-bot/.env.example` como plantilla y crea un archivo `.env` en `apps/atlas-bot/`:

```bash
cp apps/atlas-bot/.env.example apps/atlas-bot/.env
```

Actualiza cada valor antes de ejecutar o registrar comandos.

---

## Ejecutar Lavalink localmente

El repositorio incluye una configuración lista para usar:

1. Ve a `services/lavalink/`.
2. Inicia el servicio:
   ```bash
   docker compose up -d
   ```
3. El contenedor expone `127.0.0.1:2333` y utiliza la contraseña `atlas-dev-pass`, ya reflejada en `.env.example`.
4. Para detenerlo:
   ```bash
   docker compose down
   ```

Asegúrate de que `LAVALINK_HOST`, `LAVALINK_PORT` y `LAVALINK_PASSWORD` coinciden con esta configuración (o actualízalos si cambias los valores).

---

## Ejecutar Atlas Song

1. Instala dependencias (`pnpm install`) y configura el `.env`.
2. Inicia Lavalink como se describió antes.
3. Inicia el bot en modo desarrollo:
   ```bash
   pnpm --filter atlas-bot dev
   ```
4. Para compilar y ejecutar la versión transpIlada:
   ```bash
   pnpm --filter atlas-bot build
   pnpm --filter atlas-bot start
   ```

El bot necesita estar invitado al/los servidores correspondientes y tener permisos para conectarse a canales de voz.

---

## Desplegar slash commands

Los comandos se registran de forma explícita en los guilds definidos por `DISCORD_GUILD_ID_1` y `DISCORD_GUILD_ID_2`:

```bash
pnpm --filter atlas-bot deploy:commands
```

Ejecuta este comando cada vez que modifiques `apps/atlas-bot/src/commands.ts` o cambies los servidores objetivo.
