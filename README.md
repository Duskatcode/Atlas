# Atlas

Atlas es un bot modular de Discord que corre en un solo proceso (`apps/atlas-bot`) y carga módulos de dominio en runtime.

Estado operativo de esta etapa:
- `atlas-songer` para comandos musicales bajo `/songer`
- `atlas-creator` para templates de servidor bajo `/creator`

## Arquitectura actual

```text
Atlas/
├── apps/
│   └── atlas-bot/            # orquestador runtime
├── packages/
│   ├── atlas-core/           # registry y carga de módulos
│   ├── atlas-types/          # contratos de módulos e interacciones
│   ├── atlas-shared/         # flags, utilidades compartidas, logger
│   ├── atlas-songer/         # dominio musical (/songer)
│   └── atlas-creator/        # dominio templates (/creator)
└── services/
    └── lavalink/             # servicio externo para reproducción musical
```

`apps/atlas-bot` no contiene lógica de negocio de Songer/Creator: inicializa cliente, carga módulos y enruta interacciones.

## Módulos y flags

Los módulos se controlan por variables de entorno:

- `ENABLE_ATLAS_SONGER=true|false`
- `ENABLE_ATLAS_CREATOR=true|false`

Defaults en `.env.example`:
- `ENABLE_ATLAS_SONGER=true`
- `ENABLE_ATLAS_CREATOR=false`

## Variables de entorno

Configura `apps/atlas-bot/.env` a partir de `apps/atlas-bot/.env.example`.

Requeridas:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID_1`
- `DISCORD_GUILD_ID_2`
- `LAVALINK_HOST`
- `LAVALINK_PORT`
- `LAVALINK_PASSWORD`
- `ENABLE_ATLAS_SONGER`
- `ENABLE_ATLAS_CREATOR`

## Scripts operativos

Desde la raíz:

- `pnpm run build`: compila todo el workspace.
- `pnpm run typecheck`: validación TypeScript sin emitir.
- `pnpm run verify`: build + typecheck.
- `pnpm run bot:dev`: arranca el bot en modo desarrollo.
- `pnpm run bot:start`: arranca desde `dist`.
- `pnpm run bot:deploy`: despliega slash commands en los guilds configurados.
- `pnpm run lavalink:up`: levanta Lavalink con Docker.
- `pnpm run lavalink:logs`: sigue logs de Lavalink.
- `pnpm run lavalink:down`: detiene Lavalink.

Desde `apps/atlas-bot` también existen:
- `pnpm run build`
- `pnpm run typecheck`
- `pnpm run verify`
- `pnpm run dev`
- `pnpm run deploy:commands`

## Flujo de arranque dual (Songer + Creator)

1. Configura `apps/atlas-bot/.env` con ambos módulos habilitados:
   - `ENABLE_ATLAS_SONGER=true`
   - `ENABLE_ATLAS_CREATOR=true`
2. Levanta Lavalink:
   - `pnpm run lavalink:up`
3. Verifica compilación:
   - `pnpm run verify`
4. Despliega commands:
   - `pnpm run bot:deploy`
5. Arranca bot:
   - `pnpm run bot:dev`

## Prueba manual de `/songer`

Checklist sugerido:

1. `/songer join` en un canal de voz.
2. `/songer play source:<url o búsqueda>`
3. Usa botones de player (`Pausar/Reanudar`, `Siguiente`, `Random`, `Detener`, `Salir`).
4. `/songer volume percent:50`
5. `/songer nowplaying`
6. `/songer leave`

## Prueba manual de `/creator`

Checklist sugerido:

1. `/creator templates` para listar plantillas.
2. `/creator preview template:basic-community` para validar plan dry-run.
3. `/creator apply template:basic-community`
4. Confirma con botón `Confirmar apply`.
5. Repite `/creator apply template:basic-community` y valida comportamiento idempotente (debe omitir existentes).
6. Lanza `/creator apply` y deja expirar confirmación para validar expiración del flujo.

## Notas operativas

- `atlas-songer` depende de Lavalink activo y credenciales correctas.
- `atlas-creator` aplica política no destructiva (`create-or-skip`): crea faltantes y omite existentes.
- Esta etapa no incluye presets avanzados ni acciones destructivas en Creator.
