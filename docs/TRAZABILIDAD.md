# Trazabilidad de Atlas

Resumen de hitos principales de la transición a arquitectura modular dual.

## Hitos

1. **Inicialización del monorepo**
- Base TypeScript + pnpm workspace.
- App inicial de bot en Discord.

2. **Fundación modular (phase0)**
- Contratos comunes en `@atlas/types`.
- Registro de módulos en `@atlas/core`.
- Flags por entorno en `@atlas/shared`.

3. **Orquestador del bot (phase0)**
- `apps/atlas-bot` como capa de bootstrap + routing.
- Carga centralizada de módulos y handlers.

4. **Migración de Songer (phase0)**
- Dominio musical extraído a `@atlas/songer`.
- Integración por módulo en el orquestador.

5. **Base de Creator (phase1)**
- Módulo `@atlas/creator` con `/creator templates` y `/creator preview`.
- Plantilla inicial `basic-community` en modo no destructivo.

6. **Apply seguro de Creator (phase1)**
- `/creator apply` con confirmación explícita.
- Expiración de confirmación y restricción por usuario.
- Creación segura (sin borrar/sobrescribir, con omisiones idempotentes).

## Estado de arquitectura

ATLAS opera como un solo proceso con dos dominios desacoplados:

- `atlas-songer` (música)
- `atlas-creator` (estructura de servidor)

Controlados por flags:

- `ENABLE_ATLAS_SONGER`
- `ENABLE_ATLAS_CREATOR`

## Documentación relacionada

- `README.md`: arquitectura, setup y operación diaria.
- `docs/OPERACION_DUAL.md`: checklist manual de validación en Discord.
