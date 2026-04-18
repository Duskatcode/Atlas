# Operación dual: Songer + Creator

Guía rápida para operar el bot con los dos módulos en un mismo proceso.

## 1) Preparación

1. Copia `apps/atlas-bot/.env.example` a `apps/atlas-bot/.env`.
2. Completa credenciales de Discord y Lavalink.
3. Habilita ambos módulos:
   - `ENABLE_ATLAS_SONGER=true`
   - `ENABLE_ATLAS_CREATOR=true`

## 2) Levantar dependencias

En la raíz del repo:

```bash
pnpm run lavalink:up
pnpm run lavalink:logs
```

Valida que Lavalink quede escuchando en `LAVALINK_HOST:LAVALINK_PORT`.

## 3) Verificación técnica local

```bash
pnpm run verify
```

Si falla, corrige build/typecheck antes de desplegar comandos.

## 4) Deploy de slash commands

```bash
pnpm run bot:deploy
```

Este script publica comandos en los dos guilds configurados:
- `DISCORD_GUILD_ID_1`
- `DISCORD_GUILD_ID_2`

## 5) Arranque del bot

```bash
pnpm run bot:dev
```

Confirma en logs que el bot queda listo y módulos activos.

## 6) Smoke test `/songer`

1. `/songer join`
2. `/songer play source:<url o búsqueda>`
3. botones del player (`Pausar/Reanudar`, `Siguiente`, `Random`, `Detener`, `Salir`)
4. `/songer volume percent:50`
5. `/songer nowplaying`
6. `/songer leave`

## 7) Smoke test `/creator`

1. `/creator templates`
2. `/creator preview template:basic-community`
3. `/creator apply template:basic-community`
4. confirmación por botón `Confirmar apply`
5. repetir `/creator apply` para validar create-or-skip
6. lanzar `/creator apply` y esperar expiración para validar timeout del flujo

## 8) Criterios mínimos de aceptación

- Los comandos `/songer` y `/creator` aparecen y responden.
- Songer reproduce audio con Lavalink disponible.
- Creator preview no modifica el servidor.
- Creator apply crea faltantes y omite existentes (no destructivo).

## 9) Cierre

```bash
pnpm run lavalink:down
```
