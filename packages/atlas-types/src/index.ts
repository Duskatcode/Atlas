import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  ModalSubmitInteraction,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

export type KnownAtlasModuleId = 'atlas-songer' | 'atlas-creator';
export type AtlasModuleId = KnownAtlasModuleId | (string & {});

export type ModuleFlagValue = string | number | boolean | null | undefined;
export type ModuleFlagSource = Partial<Record<string, ModuleFlagValue>>;

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | RESTPostAPIChatInputApplicationCommandsJSONBody;

export interface SlashCommandHandler {
  id?: string;
  description?: string;
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

export interface ButtonHandler {
  id?: string;
  description?: string;
  customId: string | RegExp;
  execute: (interaction: ButtonInteraction) => Promise<void> | void;
}

export interface SelectMenuHandler {
  id?: string;
  description?: string;
  customId: string | RegExp;
  execute: (interaction: AnySelectMenuInteraction) => Promise<void> | void;
}

export interface ModalHandler {
  id?: string;
  description?: string;
  customId: string | RegExp;
  execute: (interaction: ModalSubmitInteraction) => Promise<void> | void;
}

export interface EventHandler<Event extends keyof ClientEvents = keyof ClientEvents> {
  id?: string;
  description?: string;
  event: Event;
  once?: boolean;
  execute: (...args: ClientEvents[Event]) => Promise<void> | void;
}

export type AtlasModuleFlags = Record<string, boolean>;

export interface AtlasLogger {
  scope?: string;
  info: (message: string, ...meta: unknown[]) => void;
  warn: (message: string, ...meta: unknown[]) => void;
  error: (message: string, ...meta: unknown[]) => void;
  debug?: (message: string, ...meta: unknown[]) => void;
}

export interface AtlasModuleContext {
  client: Client;
  flags: AtlasModuleFlags;
  logger: AtlasLogger;
}

export interface AtlasModule {
  id: AtlasModuleId;
  name: string;
  description?: string;
  version?: string;
  keywords?: string[];
  defaultEnabled?: boolean;
  slashCommands?: SlashCommandHandler[];
  buttonHandlers?: ButtonHandler[];
  selectMenuHandlers?: SelectMenuHandler[];
  modalHandlers?: ModalHandler[];
  eventHandlers?: EventHandler[];
  setup?: (context: AtlasModuleContext) => Promise<void> | void;
}

export type AtlasModuleLoaderResult = AtlasModule | AtlasModule[] | null | undefined;
export type AtlasModuleLoader =
  | (() => AtlasModuleLoaderResult | Promise<AtlasModuleLoaderResult>)
  | {
      load: () => AtlasModuleLoaderResult | Promise<AtlasModuleLoaderResult>;
    };

export interface AtlasModuleSummary {
  id: AtlasModuleId;
  name: string;
  enabled: boolean;
  description?: string;
}
