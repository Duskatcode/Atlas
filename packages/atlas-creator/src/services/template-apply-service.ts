import {
  ChannelType,
  type CategoryChannel,
  type Guild,
  type GuildChannel,
  type Role,
} from 'discord.js';
import { CREATOR_SAFE_APPLY_POLICY } from '../domain/policies/index.js';
import type { CreatorTemplateResource } from '../domain/templates/index.js';
import { getCreatorTemplateById } from './template-catalog-service.js';

export interface CreatorApplyResultItem {
  resource: CreatorTemplateResource;
  status: 'created' | 'skipped' | 'failed';
  detail: string;
}

export interface CreatorApplyReport {
  templateId: string;
  templateName: string;
  created: number;
  skipped: number;
  failed: number;
  items: CreatorApplyResultItem[];
}

const normalizeName = (value: string) => value.trim().toLowerCase();

const findRoleByName = (guild: Guild, roleName: string): Role | null => {
  const normalizedName = normalizeName(roleName);
  return (
    guild.roles.cache.find((role) => normalizeName(role.name) === normalizedName) ?? null
  );
};

const findCategoryByName = (
  guild: Guild,
  categoryName: string,
): CategoryChannel | null => {
  const normalizedName = normalizeName(categoryName);
  return (
    guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        normalizeName(channel.name) === normalizedName,
    ) as CategoryChannel | undefined
  ) ?? null;
};

const findChannelByTypeAndName = (
  guild: Guild,
  channelType: ChannelType.GuildText | ChannelType.GuildVoice,
  channelName: string,
  parentId: string | null,
): GuildChannel | null => {
  const normalizedName = normalizeName(channelName);

  return (
    guild.channels.cache.find(
      (channel) =>
        channel.type === channelType &&
        normalizeName(channel.name) === normalizedName &&
        (channel.parentId ?? null) === parentId,
    ) as GuildChannel | undefined
  ) ?? null;
};

const createReport = (templateId: string, templateName: string): CreatorApplyReport => ({
  templateId,
  templateName,
  created: 0,
  skipped: 0,
  failed: 0,
  items: [],
});

const pushReportItem = (
  report: CreatorApplyReport,
  item: CreatorApplyResultItem,
) => {
  report.items.push(item);

  if (item.status === 'created') report.created += 1;
  if (item.status === 'skipped') report.skipped += 1;
  if (item.status === 'failed') report.failed += 1;
};

const buildApplyReason = (templateId: string) =>
  `[Atlas Creator] apply ${templateId} (${CREATOR_SAFE_APPLY_POLICY.duplicateStrategy})`;

export const applyCreatorTemplateSafely = async (
  guild: Guild,
  templateId: string,
): Promise<CreatorApplyReport> => {
  const template = getCreatorTemplateById(templateId);
  if (!template) {
    throw new Error(`No encontré la plantilla \`${templateId}\`.`);
  }

  const report = createReport(template.id, template.name);
  const applyReason = buildApplyReason(template.id);
  const categoriesByName = new Map<string, CategoryChannel>();

  const ensureCategory = async (categoryName: string): Promise<CategoryChannel | null> => {
    const normalizedName = normalizeName(categoryName);
    const existingFromMap = categoriesByName.get(normalizedName);
    if (existingFromMap) {
      return existingFromMap;
    }

    const existingCategory = findCategoryByName(guild, categoryName);
    if (existingCategory) {
      categoriesByName.set(normalizedName, existingCategory);
      return existingCategory;
    }

    try {
      const createdCategory = (await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        reason: applyReason,
      })) as CategoryChannel;
      categoriesByName.set(normalizedName, createdCategory);
      return createdCategory;
    } catch {
      return null;
    }
  };

  const roleResources = template.plannedResources.filter((resource) => resource.kind === 'role');
  for (const resource of roleResources) {
    const existingRole = findRoleByName(guild, resource.name);
    if (existingRole) {
      pushReportItem(report, {
        resource,
        status: 'skipped',
        detail: 'Ya existe un rol con ese nombre.',
      });
      continue;
    }

    try {
      await guild.roles.create({
        name: resource.name,
        reason: applyReason,
      });
      pushReportItem(report, {
        resource,
        status: 'created',
        detail: 'Rol creado correctamente.',
      });
    } catch (error) {
      pushReportItem(report, {
        resource,
        status: 'failed',
        detail:
          error instanceof Error
            ? `No se pudo crear el rol: ${error.message}`
            : 'No se pudo crear el rol.',
      });
    }
  }

  const categoryResources = template.plannedResources.filter(
    (resource) => resource.kind === 'category',
  );
  for (const resource of categoryResources) {
    const existingCategory = findCategoryByName(guild, resource.name);
    if (existingCategory) {
      categoriesByName.set(normalizeName(resource.name), existingCategory);
      pushReportItem(report, {
        resource,
        status: 'skipped',
        detail: 'Ya existe una categoria con ese nombre.',
      });
      continue;
    }

    try {
      const createdCategory = (await guild.channels.create({
        name: resource.name,
        type: ChannelType.GuildCategory,
        reason: applyReason,
      })) as CategoryChannel;
      categoriesByName.set(normalizeName(resource.name), createdCategory);
      pushReportItem(report, {
        resource,
        status: 'created',
        detail: 'Categoria creada correctamente.',
      });
    } catch (error) {
      pushReportItem(report, {
        resource,
        status: 'failed',
        detail:
          error instanceof Error
            ? `No se pudo crear la categoria: ${error.message}`
            : 'No se pudo crear la categoria.',
      });
    }
  }

  const channelResources = template.plannedResources.filter(
    (resource) => resource.kind === 'text-channel' || resource.kind === 'voice-channel',
  );
  for (const resource of channelResources) {
    const channelType =
      resource.kind === 'text-channel'
        ? ChannelType.GuildText
        : ChannelType.GuildVoice;

    let parentCategory: CategoryChannel | null = null;
    if (resource.parentName) {
      parentCategory = await ensureCategory(resource.parentName);
      if (!parentCategory) {
        pushReportItem(report, {
          resource,
          status: 'failed',
          detail: `No se pudo resolver o crear la categoria padre "${resource.parentName}".`,
        });
        continue;
      }
    }

    const existingChannel = findChannelByTypeAndName(
      guild,
      channelType,
      resource.name,
      parentCategory?.id ?? null,
    );
    if (existingChannel) {
      pushReportItem(report, {
        resource,
        status: 'skipped',
        detail: 'Ya existe un canal equivalente; se mantiene sin cambios.',
      });
      continue;
    }

    try {
      await guild.channels.create({
        name: resource.name,
        type: channelType,
        parent: parentCategory?.id,
        reason: applyReason,
      });
      pushReportItem(report, {
        resource,
        status: 'created',
        detail: 'Canal creado correctamente.',
      });
    } catch (error) {
      pushReportItem(report, {
        resource,
        status: 'failed',
        detail:
          error instanceof Error
            ? `No se pudo crear el canal: ${error.message}`
            : 'No se pudo crear el canal.',
      });
    }
  }

  return report;
};

export const formatCreatorApplyReport = (report: CreatorApplyReport): string => {
  const lines = report.items.map(
    (item, index) =>
      `${index + 1}. [${item.status.toUpperCase()}] ${item.resource.kind} \`${item.resource.name}\`\n   ${item.detail}`,
  );

  return [
    `## Apply ejecutado: ${report.templateName}`,
    `Template: \`${report.templateId}\``,
    '',
    `Resultado: **${report.created} creados**, **${report.skipped} omitidos**, **${report.failed} fallidos**.`,
    '',
    `Politica aplicada: \`${CREATOR_SAFE_APPLY_POLICY.mode}\` + \`${CREATOR_SAFE_APPLY_POLICY.duplicateStrategy}\` (no destructiva, sin sobrescrituras).`,
    '',
    '### Detalle',
    ...lines,
  ].join('\n');
};
