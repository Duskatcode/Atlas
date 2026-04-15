# Atlas

Atlas es un bot de Discord modular ejecutado en un solo proceso (`apps/atlas-bot`) con dos dominios independientes:

1. **Songer**: dominio musical.
2. **Creator**: dominio de plantillas para estructura de servidor.

## Arquitectura modular

### Capas y responsabilidades

1. **`apps/atlas-bot`**
- Orquestador del proceso.
- Inicializa cliente Discord.
- Carga módulos desde registro.
- Enruta slash commands, botones, selects, modals y eventos.
- Despliega comandos agregados según flags.

2. **`packages/atlas-core`**
- Registro de módulos (`AtlasModuleRegistry`).
- Resolución de módulos activos/inactivos por flags.
- Exposición de handlers por tipo de interacción.

3. **`packages/atlas-types`**
- Contratos compartidos (`AtlasModule`, handlers, `AtlasModuleContext`, etc.).

4. **`packages/atlas-shared`**
- Utilidades transversales.
- Gestión de flags por entorno (`ENABLE_ATLAS_SONGER`, `ENABLE_ATLAS_CREATOR`).

5. **`packages/atlas-songer`**
- Dominio musical (Lavalink/Shoukaku, cola, comandos y botones de reproducción).

6. **`packages/atlas-creator`**
- Dominio de plantillas.
- `/creator templates`, `/creator preview`, `/creator apply` con confirmación segura.

### Estructura actual

```txt
Atlas/
├── apps/
│   └── atlas-bot/
├── packages/
│   ├── atlas-core/
│   ├── atlas-shared/
│   ├── atlas-types/
│   ├── atlas-songer/
│   └── atlas-creator/
└── docs/
```

## Modelo dual de módulos

### Flags de módulos

Definidas en `apps/atlas-bot/.env`:

- `ENABLE_ATLAS_SONGER=true|false`
- `ENABLE_ATLAS_CREATOR=true|false`

Valores por defecto actuales:

- Songer: `true`
- Creator: `false`

Ejemplo para activar ambos dominios:

```env
ENABLE_ATLAS_SONGER=true
ENABLE_ATLAS_CREATOR=true
```

## Requisitos

1. Node.js 22+
2. pnpm 10+
3. Bot de Discord con intents/permisos requeridos
4. Lavalink disponible para flujo musical (`atlas-songer`)

## Configuración local

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear `.env` para `apps/atlas-bot` desde `.env.example`:

```bash
cp apps/atlas-bot/.env.example apps/atlas-bot/.env
```

3. Completar variables:

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

Scripts en raíz del repo:

- `pnpm build`: build de todo el workspace.
- `pnpm typecheck`: chequeo TS sin emitir.
- `pnpm verify`: `build + typecheck`.
- `pnpm bot:dev`: correr bot en modo desarrollo.
- `pnpm bot:build`: build de `apps/atlas-bot`.
- `pnpm bot:start`: ejecutar build del bot.
- `pnpm bot:deploy-commands`: desplegar slash commands por guild.

## Cómo correr el bot

1. Build (opcional si usas `bot:dev`):

```bash
pnpm build
```

2. Desplegar slash commands:

```bash
pnpm bot:deploy-commands
```

3. Levantar proceso del bot:

```bash
pnpm bot:dev
```

## Cómo probar Songer (dominio musical)

`atlas-songer` hoy expone comandos slash top-level (no agrupados bajo `/songer` todavía):

- `/join`
- `/play source:<url|query>`
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/leave`
- `/volume percent:<0..200>`
- `/nowplaying`

Flujo manual recomendado:

1. Entrar a un canal de voz.
2. Ejecutar `/join`.
3. Ejecutar `/play` con URL o texto de búsqueda.
4. Validar controles de botones y comandos de reproducción.
5. Finalizar con `/stop` y `/leave`.

## Cómo probar Creator (dominio plantillas)

Comando agrupado bajo `/creator`:

- `/creator templates`
- `/creator preview template:basic-community [community_name]`
- `/creator apply template:basic-community [community_name]`

Flujo manual recomendado:

1. Ejecutar `/creator templates` y validar listado.
2. Ejecutar `/creator preview ...` y revisar plan (roles/categorías/canales).
3. Ejecutar `/creator apply ...`.
4. Confirmar con botón `Confirmar apply` antes de expirar.
5. Validar resultado:
- creados
- omitidos (si ya existían equivalentes)
- errores reportados

## Seguridad de Creator apply (MVP)

1. Requiere contexto de guild.
2. Requiere permisos del usuario (`Manage Server` o `Administrator`).
3. Requiere permisos del bot (`ManageRoles`, `ManageChannels`).
4. No elimina recursos.
5. No sobrescribe agresivamente.
6. Evita duplicados equivalentes.
7. Confirmación expirable y restringida al usuario iniciador.

## Notas operativas

1. Si no aparecen comandos de Creator, revisa `ENABLE_ATLAS_CREATOR=true` y vuelve a desplegar slash commands.
2. Si Songer falla al reproducir, valida conectividad/credenciales de Lavalink.
3. Si un módulo está desactivado por flag, el bot sigue operando con los demás módulos activos.
