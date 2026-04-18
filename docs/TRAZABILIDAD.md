# Trazabilidad Atlas (runtime modular)

Este documento resume hitos funcionales reales del repositorio.

## Hito 1: Runtime modular base
- `apps/atlas-bot` pasó a ser orquestador runtime.
- Se consolidó `atlas-core` como registry de módulos.
- Se definieron contratos de módulo en `atlas-types`.
- Se introdujeron flags de runtime:
  - `ENABLE_ATLAS_SONGER`
  - `ENABLE_ATLAS_CREATOR`

## Hito 2: Migración Songer
- Dominio musical aislado en `packages/atlas-songer`.
- Comandos migrados a namespace `/songer`.
- Interacciones del player encapsuladas en el módulo.

## Hito 3: Hardening Songer MVP
- Validaciones de contexto de voz y mismo canal.
- Restricciones de controles sensibles.
- TTL y limpieza de selecciones pendientes.
- Manejo más robusto de estado y errores operativos.

## Hito 4: Creator templates + preview
- `packages/atlas-creator` dejó de ser placeholder.
- Se creó modelo de template y planner legible.
- Se introdujeron:
  - `/creator templates`
  - `/creator preview`

## Hito 5: Creator safe apply MVP
- Se agregó `/creator apply` con validaciones previas.
- Confirmación explícita por botón, ligada al usuario.
- Expiración y limpieza de confirmaciones pendientes.
- Executor no destructivo para `basic-community`:
  - create-or-skip
  - idempotencia mínima
  - sin borrado ni sobrescritura agresiva

## Estado operativo objetivo de esta etapa
- Un solo proceso de bot con ambos módulos activos:
  - `atlas-songer`
  - `atlas-creator`
- Flujo documentado de build, deploy y pruebas manuales duales.
