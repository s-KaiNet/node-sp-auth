import { CacheItem } from './CacheItem';
import * as crypto from 'crypto';

export class Cache {

  private _cache: { [key: string]: CacheItem } = {};

  public set<T>(key: string, data: T, expiration?: number | Date): void {
    let cacheItem: CacheItem = undefined;
    key = this.getHashKey(key);

    if (!expiration) {
      cacheItem = new CacheItem(data);
    } else if (typeof expiration === 'number') {
      const now: Date = new Date();
      now.setSeconds(now.getSeconds() + expiration);
      cacheItem = new CacheItem(data, now);
    } else if (expiration instanceof Date) {
      cacheItem = new CacheItem(data, expiration);
    }

    this._cache[key] = cacheItem;
  }

  public get<T>(key: string): T {
    key = this.getHashKey(key);
    const cacheItem: CacheItem = this._cache[key];

    if (!cacheItem) {
      return undefined;
    }

    if (!cacheItem.expiredOn) {
      return cacheItem.data;
    }

    const now: Date = new Date();

    if (now > cacheItem.expiredOn) {
      this.remove(key);
      return undefined;
    } else {
      return cacheItem.data;
    }
  }

  public remove(key: string): void {
    key = this.getHashKey(key);
    delete this._cache[key];
  }

  public clear(): void {
    this._cache = {};
  }

  private getHashKey(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }
}
