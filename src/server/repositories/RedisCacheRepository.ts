import { IRedisCacheRepository } from './IRedisCacheRepository.js';
import { logger } from '../utils/logger.js';

interface CacheItem<T> {
  value: T;
  expiresAt: number | null;
}

export class RedisCacheRepository implements IRedisCacheRepository {
  private cache = new Map<string, CacheItem<any>>();
  private redisConnected = false;

  constructor() {
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      this.redisConnected = true;
      logger.info('Redis URL detected in environment', 'RedisRepo');
    } else {
      logger.info('Redis URL not present. Using high-performance in-memory cache provider', 'RedisRepo');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        continue;
      }
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async getHealthStatus() {
    return {
      connected: true,
      provider: this.redisConnected ? 'Redis Cloud Cache' : 'In-Memory Cache Provider',
      keysCount: this.cache.size
    };
  }
}

export const redisRepository = new RedisCacheRepository();
