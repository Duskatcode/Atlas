# Operación Dual de ATLAS (Songer + Creator)

Esta guía describe cómo operar y validar los dos dominios en el mismo proceso del bot.

## 1. Objetivo operativo

ATLAS corre en **un solo proceso** (`apps/atlas-bot`) y carga módulos por flags:

- `atlas-songer` (música)
- `atlas-creator` (plantillas)

## 2. Preparación

1. Instala dependencias:

```bash
pnpm install
```

2. Configura `.env` desde `apps/atlas-bot/.env.example`.

3. Activa modo dual:

```env
ENABLE_ATLAS_SONGER=true
ENABLE_ATLAS_CREATOR=true
```

4. Verifica compilación:

```bash
pnpm verify
```

## 3. Despliegue y arranque

1. Despliega slash commands:

```bash
pnpm bot:deploy-commands
```

2. Arranca el bot:

```bash
pnpm bot:dev
```

3. En logs debes ver resumen de módulos:

- Songer activo
- Creator activo

## 4. Checklist manual de Songer

Comandos disponibles actualmente:

Nota: en esta fase, Songer usa comandos slash top-level (no agrupados bajo `/songer` todavía).

- `/join`
- `/play source:<url|query>`
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/leave`
- `/volume percent:<0..200>`
- `/nowplaying`

Pasos sugeridos:

1. Entra a un canal de voz.
2. Ejecuta `/join`.
3. Ejecuta `/play` con una URL o query.
4. Valida reproducción y controles.
5. Ejecuta `/pause` y `/resume`.
6. Ejecuta `/skip`.
7. Ejecuta `/stop` y `/leave`.

Resultado esperado:

- Reproducción funcional.
- Controles de cola sin errores.
- Limpieza de sesión al salir.

## 5. Checklist manual de Creator

Comandos disponibles:

- `/creator templates`
- `/creator preview template:basic-community [community_name]`
- `/creator apply template:basic-community [community_name]`

Pasos sugeridos:

1. Ejecuta `/creator templates`.
2. Ejecuta `/creator preview` y revisa plan (roles/categorías/canales).
3. Ejecuta `/creator apply`.
4. Confirma con botón `Confirmar apply`.
5. Repite `/creator apply` para validar comportamiento idempotente.

Resultado esperado:

- Se crean recursos faltantes.
- Recursos equivalentes se reportan como omitidos.
- No hay borrados.
- No hay sobrescritura agresiva.

## 6. Reglas de seguridad de Creator apply

1. Solo en contexto de guild.
2. Usuario requiere `Manage Server` o `Administrator`.
3. Bot requiere `ManageRoles` y `ManageChannels`.
4. Confirmación expirable.
5. Confirmación limitada al usuario iniciador.
6. Sin operaciones destructivas.

## 7. Diagnóstico rápido

1. **Creator no aparece**
- Revisar `ENABLE_ATLAS_CREATOR=true`.
- Volver a ejecutar `pnpm bot:deploy-commands`.

2. **Songer no reproduce**
- Revisar `LAVALINK_HOST/PORT/PASSWORD`.
- Revisar conectividad Lavalink.

3. **Permiso denegado en Creator apply**
- Revisar permisos del usuario y del bot en el servidor/canal.
