import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

import { assertPreviewPolicy } from '../domain/policies/preview-policy.js';
import { createTemplateChangePlan } from '../domain/planner/template-planner.js';
import type { TemplateRegistryService } from '../services/template-registry-service.js';
import { renderPreviewPlan } from '../services/preview-renderer-service.js';

interface CreatorCommandHandlerOptions {
  templateRegistry: TemplateRegistryService;
}

export const createCreatorCommandHandler = (
  options: CreatorCommandHandlerOptions,
) => {
  const { templateRegistry } = options;

  return async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'templates') {
      const templates = templateRegistry.listTemplates();
      const lines = templates.map(
        (template) =>
          `- \`${template.metadata.id}\` · **${template.metadata.name}** · ${template.metadata.summary}`,
      );

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: [
          '## Atlas Creator Templates',
          ...(lines.length > 0 ? lines : ['- (sin plantillas registradas)']),
        ].join('\n'),
      });
      return;
    }

    if (subcommand === 'preview') {
      assertPreviewPolicy({ applyRequested: false });

      const templateId = interaction.options.getString('template', true);
      const communityName = interaction.options.getString('community_name') ?? undefined;

      const template = templateRegistry.getTemplateOrThrow(templateId);
      const plan = createTemplateChangePlan(template, { communityName });
      const preview = renderPreviewPlan(plan);

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: preview,
      });
      return;
    }

    throw new Error(`Subcomando de creator no soportado: ${subcommand}`);
  };
};
