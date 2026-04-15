export interface AtlasSongerLavalinkConfig {
  host: string;
  port: number;
  password: string;
  nodeName?: string;
}

export interface AtlasSongerModuleOptions {
  lavalink: AtlasSongerLavalinkConfig;
}
