export interface IRedisCacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  flush(): Promise<void>;
  getKeysByPrefix(prefix: string): Promise<string[]>;
  getHealthStatus(): Promise<{ connected: boolean; provider: string; keysCount: number }>;
}
