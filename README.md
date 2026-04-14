# Atlas

Atlas es un bot modular para Discord pensado como una suite de herramientas escalables en lugar de un bot monolítico.

La visión del proyecto es construir un ecosistema compuesto por distintas capacidades, por ejemplo:

- **Atlas Songs**: música y reproducción en canales de voz
- **Atlas Constructor**: creación y configuración de servidores mediante plantillas
- **Atlas Rank**: notificaciones, rangos, eventos y automatizaciones
- futuras extensiones como moderación, utilidades administrativas o integraciones externas

Actualmente el proyecto se encuentra en su fase inicial, con una base técnica funcional para Discord y una estructura preparada para crecer.

---

## Scripts y verificación rápida

Todos los comandos se ejecutan desde la raíz con `pnpm`:

- `pnpm dev`: corre el bot en modo desarrollo usando `tsx`.
- `pnpm typecheck`: valida los tipos de todos los paquetes (actualmente Atlas Song) sin emitir artefactos.
- `pnpm build`: compila el bot y genera la salida en `apps/atlas-bot/dist`.
- `pnpm verify`: ejecuta `typecheck` seguido de `build`; es el chequeo mínimo antes de abrir un PR o desplegar.
- `pnpm deploy:commands`: registra los slash commands en Discord.

`pnpm test` es un alias de `pnpm verify` hasta que existan pruebas reales.

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
