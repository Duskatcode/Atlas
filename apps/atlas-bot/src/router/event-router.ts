import type { BotContext } from '../context/bot-context.js';

export const registerEventHandlers = (context: BotContext): void => {
  const eventHandlers = context.registry.getEventHandlers();

  for (const handler of eventHandlers) {
    const runner = async (...args: unknown[]) => {
      try {
        await Promise.resolve(handler.execute(...(args as never)));
      } catch (error) {
        context.logger.error(
          `❌ Error en evento ${handler.id ?? handler.event}:`,
          error,
        );
      }
    };

    if (handler.once) {
      context.client.once(handler.event, runner as never);
    } else {
      context.client.on(handler.event, runner as never);
    }
  }
};
