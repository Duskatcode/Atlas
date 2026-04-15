import type {
  ButtonHandler,
  ModalHandler,
  SelectMenuHandler,
  SlashCommandHandler,
} from '@atlas/types';
import { Events, MessageFlags, type RepliableInteraction } from 'discord.js';
import type { AtlasBotContext } from '../context/bot-context.js';

const buildSlashHandlerMap = (handlers: SlashCommandHandler[]) => {
  const map = new Map<string, SlashCommandHandler>();

  for (const handler of handlers) {
    const data = handler.data;
    const name =
      typeof (data as { name?: unknown }).name === 'string'
        ? (data as { name: string }).name
        : 'toJSON' in data && typeof data.toJSON === 'function'
          ? data.toJSON()?.name
          : undefined;

    if (!name) {
      continue;
    }

    if (map.has(name)) {
      console.warn(`⚠️ Comando duplicado detectado para "${name}". Usando el último handler registrado.`);
    }

    map.set(name, handler);
  }

  return map;
};

const matchesCustomId = (pattern: string | RegExp, customId: string) => {
  return typeof pattern === 'string' ? pattern === customId : pattern.test(customId);
};

const findComponentHandler = <
  Handler extends ButtonHandler | SelectMenuHandler | ModalHandler,
>(
  handlers: Handler[],
  customId: string,
) => {
  return handlers.find((handler) => matchesCustomId(handler.customId, customId));
};

const respondToInteractionError = async (
  interaction: RepliableInteraction,
  error: unknown,
) => {
  const safeMessage =
    error instanceof Error
      ? `❌ ${error.message}`.slice(0, 1900)
      : '❌ Ocurrió un error ejecutando la interacción.';

  if ('deferred' in interaction && interaction.deferred) {
    await interaction.editReply({ content: safeMessage });
    return;
  }

  if ('replied' in interaction && interaction.replied) {
    await interaction.followUp({
      content: safeMessage,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: safeMessage,
    flags: MessageFlags.Ephemeral,
  });
};

export const registerInteractionRouter = (context: AtlasBotContext) => {
  const slashHandlers = buildSlashHandlerMap(context.registry.getSlashCommandHandlers());
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
      }
    } catch (error) {
      context.logger.error('❌ Error en interacción:', error);

      if (interaction.isRepliable()) {
        await respondToInteractionError(interaction, error);
      }
    }
  });
};
