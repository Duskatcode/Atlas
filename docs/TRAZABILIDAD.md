# Trazabilidad del proyecto Atlas

## Commit 1 - Inicialización del proyecto
**Fecha:** 2026-03-28  
**Tipo:** chore/init

### Objetivo
Inicializar la base técnica del proyecto Atlas como bot modular de Discord, dejando preparada la estructura para crecimiento por dominios como:
- Atlas Songs
- Atlas Constructor
- Atlas Rank

### Alcance de este primer commit
Se creó la estructura base del proyecto con enfoque monorepo:
- `apps/atlas-bot`
- `packages/core`
- `packages/config`
- `packages/discord-common`

### Componentes incluidos
- Configuración inicial con TypeScript
- Configuración de workspace con pnpm
- Variables de entorno mediante `.env`
- Bot funcional en Discord
- Registro de slash commands
- Comando `/ping` operativo
- Comandos `/join` y `/leave` en desarrollo
- Archivo `.gitignore` para proteger dependencias, builds y secretos

### Estado funcional al cierre de este commit
- Atlas inicia sesión correctamente
- `/ping` responde correctamente
- Los comandos se despliegan correctamente
- La conexión de voz está en fase de validación y ajuste

### Riesgos / notas
- No se deben versionar tokens ni archivos `.env`
- Los permisos del bot pueden variar según el servidor y canal
- La lógica de voz puede requerir validación específica por servidor

### Próximos pasos
1. Estabilizar `/join` y `/leave`
2. Implementar reproducción local con `/play`
3. Crear gestor de voz desacoplado
4. Introducir cola por guild
5. Separar módulos compartidos en `packages`

### Responsable
Proyecto Atlas - fase inicial