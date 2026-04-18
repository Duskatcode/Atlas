export interface SnapshotRole {
  id: string;
  name: string;
  color?: string;
  position: number;
  permissions: string[];
  hoist: boolean;
  mentionable: boolean;
  managed?: boolean;
}

export interface SnapshotPermissionOverwrite {
  targetType: 'role' | 'member';
  targetId: string;
  targetName?: string;
  allow: string[];
  deny: string[];
}

export interface SnapshotForumTag {
  id: string;
  name: string;
  moderated: boolean;
  emoji?: string;
}

export interface SnapshotChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'forum';
  position: number;
  order: number;
  parentId?: string;
  topic?: string;
  bitrate?: number;
  userLimit?: number;
  nsfw?: boolean;
  forumTags?: SnapshotForumTag[];
  permissionOverwrites: SnapshotPermissionOverwrite[];
  managed?: boolean;
}

export interface CreatorSnapshot {
  version: '1';
  kind: 'atlas.creator.snapshot';
  guildId: string;
  guildName?: string;
  capturedAt: string;
  source: 'memory' | 'file' | 'discord';
  roles: SnapshotRole[];
  channels: SnapshotChannel[];
}

export const createEmptySnapshot = (
  guildId: string,
  source: CreatorSnapshot['source'] = 'memory',
): CreatorSnapshot => ({
  version: '1',
  kind: 'atlas.creator.snapshot',
  guildId,
  capturedAt: new Date().toISOString(),
  source,
  roles: [],
  channels: [],
});
