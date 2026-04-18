export interface SnapshotRole {
  id: string;
  name: string;
  managed?: boolean;
}

export interface SnapshotChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
  parentId?: string;
  managed?: boolean;
}

export interface CreatorSnapshot {
  guildId: string;
  capturedAt: string;
  source: 'memory' | 'file' | 'discord';
  roles: SnapshotRole[];
  channels: SnapshotChannel[];
}

export const createEmptySnapshot = (
  guildId: string,
  source: CreatorSnapshot['source'] = 'memory',
): CreatorSnapshot => ({
  guildId,
  capturedAt: new Date().toISOString(),
  source,
  roles: [],
  channels: [],
});
