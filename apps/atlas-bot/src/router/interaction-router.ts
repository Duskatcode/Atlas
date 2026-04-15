import type {
  ButtonHandler,
  ModalHandler,
  SelectMenuHandler,
  SlashCommandHandler,
} from '@atlas/types';
import { Events, type Interaction, type RepliableInteraction } from 'discord.js';

import type { BotContext } from '../context/bot-context.js';

const buildSlashHandlerMap = (
  handlers: SlashCommandHandler[],
): Map<string, SlashCommandHandler> => {
  const map = new Map<string, SlashCommandHandler>();

  for (const handler of handlers) {
    const data = handler.data as SlashCommandBuilderLike;
    const name =
      typeof data.name === 'string'
        ? data.name
        : typeof data.toJSON === 'function'
          ? data.toJSON()?.name
          : undefined;
    if (!name) continue;

    if (map.has(name)) {
      console.warn(
        `⚠️ Comando duplicado detectado para "${name}". Usando el último handler registrado.`,
      );
    }

    map.set(name, handler);
  }

  return map;
};

type SlashCommandBuilderLike = {
  name?: string;
  toJSON?: () => { name?: string };
};

const matchesCustomId = (pattern: string | RegExp, customId: string) => {
  return typeof pattern === 'string' ? pattern === customId : pattern.test(customId);
};

const findComponentHandler = <T extends ButtonHandler | SelectMenuHandler | ModalHandler>(
  handlers: T[],
  customId: string,
): T | undefined => {
  return handlers.find((handler) => matchesCustomId(handler.customId, customId));
};

const respondToInteractionError = async (
  interaction: Interaction,
  error: unknown,
) => {
  if (!interaction.isRepliable()) {
    console.error('❌ La interacción no es respondible.', error);
    return;
  }

  const safeMessage =
    error instanceof Error
      ? `❌ ${error.message}`.slice(0, 1900)
      : '❌ Ocurrió un error ejecutando la interacción.';

  const target = interaction as RepliableInteraction;

  if (target.deferred) {
    await target.editReply({ content: safeMessage });
    return;
  }

  if (target.replied) {
    await target.followUp({ content: safeMessage, ephemeral: true });
    return;
  }

  await target.reply({ content: safeMessage, ephemeral: true });
};

export const registerInteractionRouter = (context: BotContext): void => {
  const slashHandlers = buildSlashHandlerMap(
    context.registry.getSlashCommandHandlers(),
  );
  const buttonHandlers = context.registry.getButtonHandlers();
  const selectMenuHandlers = context.registry.getSelectMenuHandlers();
  const modalHandlers = context.registry.getModalHandlers();

  context.client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const handler = slashHandlers.get(interaction.commandName);
        if (!handler) return;

        await Promise.resolve(handler.execute(interaction));
        return;
      }

      if (interaction.isButton()) {
        const handler = findComponentHandler(buttonHandlers, interaction.customId);
        if (!handler) return;

        await Promise.resolve(handler.execute(interaction));
        return;
      }

      if (interaction.isAnySelectMenu()) {
        const handler = findComponentHandler(selectMenuHandlers, interaction.customId);
        if (!handler) return;

        await Promise.resolve(handler.execute(interaction));
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = findComponentHandler(modalHandlers, interaction.customId);
        if (!handler) return;

        await Promise.resolve(handler.execute(interaction));
        return;
      }
    } catch (error) {
      context.logger.error('❌ Error en interacción:', error);
      await respondToInteractionError(interaction, error);
    }
  });
};
