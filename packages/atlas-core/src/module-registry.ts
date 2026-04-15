import { createConsoleLogger, isModuleFlagEnabled } from '@atlas/shared';
import type {
  AtlasLogger,
  AtlasModule,
  AtlasModuleContext,
  AtlasModuleLoader,
  AtlasModuleLoaderResult,
  AtlasModuleFlags,
  AtlasModuleSummary,
  ButtonHandler,
  EventHandler,
  ModalHandler,
  SelectMenuHandler,
  SlashCommandHandler,
} from '@atlas/types';

interface RegisteredModuleRecord {
  definition: AtlasModule;
  enabled: boolean;
  initialized: boolean;
}

export interface AtlasModuleRegistryOptions {
  client: AtlasModuleContext['client'];
  flags?: AtlasModuleFlags;
  logger?: AtlasLogger;
}

type ModuleHandlerKey =
  | 'slashCommands'
  | 'buttonHandlers'
  | 'selectMenuHandlers'
  | 'modalHandlers'
  | 'eventHandlers';

type ModuleHandlerItem<Key extends ModuleHandlerKey> =
  NonNullable<AtlasModule[Key]> extends Array<infer Item> ? Item : never;

export class AtlasModuleRegistry {
  private readonly modules: RegisteredModuleRecord[] = [];
  private readonly flags: AtlasModuleFlags;
  private readonly logger: AtlasLogger;

  constructor(private readonly options: AtlasModuleRegistryOptions) {
    this.flags = options.flags ?? {};
    this.logger = options.logger ?? createConsoleLogger('atlas:modules');
  }

  registerModule(module: AtlasModule): void {
    const enabled = this.resolveEnabledState(module);
    const index = this.modules.findIndex((record) => record.definition.id === module.id);
    const record: RegisteredModuleRecord = {
      definition: module,
      enabled,
      initialized: false,
    };

    if (index >= 0) {
      this.modules[index] = record;
      this.logger.warn(
        `Reemplazando registro previo para el módulo "${module.name}" (${module.id}).`,
      );
    } else {
      this.modules.push(record);
    }

    const message = enabled
      ? `Módulo "${module.name}" listo.`
      : `Módulo "${module.name}" deshabilitado por flags.`;

    this.logger.info(message);
  }

  registerModules(modules: Iterable<AtlasModule>): void {
    for (const module of modules) {
      this.registerModule(module);
    }
  }

  async loadModules(loaders: Iterable<AtlasModuleLoader>): Promise<void> {
    for (const loader of loaders) {
      const resolved = await Promise.resolve(
        typeof loader === 'function' ? loader() : loader.load(),
      );
      const modules = normalizeLoaderResult(resolved);
      this.registerModules(modules);
    }
  }

  async initializeModules(): Promise<void> {
    for (const record of this.modules) {
      if (!record.enabled || record.initialized) {
        continue;
      }

      const setup = record.definition.setup;
      if (typeof setup === 'function') {
        const context = this.createModuleContext(record.definition);
        await Promise.resolve(setup(context));
      }

      record.initialized = true;
    }
  }

  getActiveModules(): AtlasModule[] {
    return this.modules.filter((record) => record.enabled).map((record) => record.definition);
  }

  getModuleSummaries(): AtlasModuleSummary[] {
    return this.modules.map((record) => ({
      id: record.definition.id,
      name: record.definition.name,
      description: record.definition.description,
      enabled: record.enabled,
    }));
  }

  getSlashCommandHandlers(): SlashCommandHandler[] {
    return this.collectHandlers('slashCommands');
  }

  getButtonHandlers(): ButtonHandler[] {
    return this.collectHandlers('buttonHandlers');
  }

  getSelectMenuHandlers(): SelectMenuHandler[] {
    return this.collectHandlers('selectMenuHandlers');
  }

  getModalHandlers(): ModalHandler[] {
    return this.collectHandlers('modalHandlers');
  }

  getEventHandlers(): EventHandler[] {
    return this.collectHandlers('eventHandlers');
  }

  private collectHandlers<Key extends ModuleHandlerKey>(
    key: Key,
  ): ModuleHandlerItem<Key>[] {
    const handlers: ModuleHandlerItem<Key>[] = [];
    for (const record of this.modules) {
      if (!record.enabled) {
        continue;
      }

      const handlerGroup = record.definition[key];

      if (Array.isArray(handlerGroup)) {
        handlers.push(...(handlerGroup as ModuleHandlerItem<Key>[]));
      }
    }

    return handlers;
  }

  private resolveEnabledState(module: AtlasModule): boolean {
    return isModuleFlagEnabled(module.id, this.flags, module.defaultEnabled ?? false);
  }

  private createModuleContext(module: AtlasModule): AtlasModuleContext {
    return {
      client: this.options.client,
      flags: this.flags,
      logger: this.createModuleLogger(module),
    };
  }

  private createModuleLogger(module: AtlasModule): AtlasLogger {
    const baseLogger = this.logger;
    const prefix = `[${module.id}]`;

    return {
      scope: module.id,
      info: (message: string, ...meta: unknown[]) => baseLogger.info(`${prefix} ${message}`, ...meta),
      warn: (message: string, ...meta: unknown[]) => baseLogger.warn(`${prefix} ${message}`, ...meta),
      error: (message: string, ...meta: unknown[]) => baseLogger.error(`${prefix} ${message}`, ...meta),
      debug: baseLogger.debug
        ? (message: string, ...meta: unknown[]) => baseLogger.debug!(`${prefix} ${message}`, ...meta)
        : undefined,
    };
  }
}

const normalizeLoaderResult = (result: AtlasModuleLoaderResult): AtlasModule[] => {
  if (!result) {
    return [];
  }

  return Array.isArray(result) ? result : [result];
};
