/**
 * In-memory providers for Phase 13: Marketplace
 */

import * as crypto from 'node:crypto';
import type {
  PluginMetadata,
  SkillMetadata,
  SearchFilters,
  DownloadRequest,
  DownloadResult,
  Rating,
  BrowseMarketplaceProvider,
  SearchMarketplaceProvider,
  DownloadMarketplaceProvider,
  RateMarketplaceProvider,
  InstallMarketplaceProvider
} from '../capabilities/marketplace.js';

// Mock Marketplace Data
const PLUGIN_DATA: PluginMetadata[] = [
  {
    id: 'plg-1',
    name: 'PDF Handler',
    author: 'magocofactory',
    version: '1.2.0',
    description: 'Load, parse, and export PDFs for RAG',
    tags: ['file', 'pdf', 'document'],
    category: 'documents',
    downloads: { total: 1200, last30Days: 120 },
    rating: { average: 4.5, count: 85 },
    license: 'Apache-2.0',
    metaUrl: 'https://example.com/plugins/plg-1/metadata.json'
  },
  {
    id: 'plg-2',
    name: 'GitHub PR Reviewer',
    author: 'magocofactory',
    version: '0.3.1',
    description: 'Automatically review GitHub PRs for quality and maintainability',
    tags: ['github', 'pr', 'code-review'],
    category: 'engineers',
    downloads: { total: 2100, last30Days: 310 },
    rating: { average: 4.2, count: 150 },
    license: 'MIT',
    metaUrl: 'https://example.com/plugins/plg-2/metadata.json'
  }
];

const SKILL_DATA: SkillMetadata[] = [
  {
    id: 'ssl-1',
    name: 'Git Cleanup',
    author: 'magocofactory',
    version: '0.7.0',
    description: 'Automatically cleanup stale branches and local changes',
    tags: ['git', 'cleanup', 'workflow'],
    category: 'development',
    downloads: { total: 850, last30Days: 95 },
    rating: { average: 4.8, count: 60 }
  }
];

// 1. Browse Marketplace Provider
export function createBrowseMarketplaceProvider(): BrowseMarketplaceProvider {
  return {
    async getPopular(limit = 10): Promise<(PluginMetadata | SkillMetadata)[]> {
      const sorted = [...PLUGIN_DATA, ...SKILL_DATA].sort((a, b) =>
        b.downloads.last30Days - a.downloads.last30Days
      );
      return limit > 0 ? sorted.slice(0, limit) : sorted;
    },

    async getCategories(): Promise<string[]> {
      const categories = [...PLUGIN_DATA, ...SKILL_DATA].map(item => item.category);
      return [...new Set(categories)];
    },

    async getListings(filters?: SearchFilters): Promise<(PluginMetadata | SkillMetadata)[]> {
      let result = [...PLUGIN_DATA, ...SKILL_DATA] as (PluginMetadata | SkillMetadata)[];

      if (filters?.tags) {
        result = result.filter(item =>
          item.tags.some((tag: string) => filters.tags!.includes(tag))
        );
      }

      if (filters?.authors) {
        result = result.filter(item =>
          item.author && filters.authors!.includes(item.author)
        );
      }

      if (filters?.categories) {
        result = result.filter(item =>
          filters.categories!.includes(item.category)
        );
      }
      
      if (filters?.keywords && filters.keywords.length > 0) {
        const kw = filters.keywords[0];
        if (kw) {
          result = result.filter(item =>
            item.name.toLowerCase().includes(kw.toLowerCase()) ||
            item.description && item.description.toLowerCase().includes(kw.toLowerCase())
          );
        }
      }

      if (filters?.minRating) {
        result = result.filter(item => {
          const rating = (item as PluginMetadata).rating;
          return rating && rating.average >= filters.minRating!;
        });
      }

      return filters?.limit ? result.slice(0, filters.limit) : result;
    }
  };
}

// 2. Search Marketplace Provider
export function createSearchMarketplaceProvider(): SearchMarketplaceProvider {
  return {
    search(filters: SearchFilters): Promise<(PluginMetadata | SkillMetadata)[]> {
      return createBrowseMarketplaceProvider().getListings(filters);
    }
  };
}

// 3. Download Marketplace Provider
export function createDownloadMarketplaceProvider(): DownloadMarketplaceProvider {
  const downloads: DownloadRequest[] = [];

  return {
    async prepareDownload(req: DownloadRequest): Promise<DownloadResult> {
      const { pluginId, skillId, origin, format } = req;

      if (!pluginId && !skillId) {
        return {
          id: crypto.randomUUID(),
          success: false,
          error: 'Either pluginId or skillId must be provided'
        };
      }

      const id = crypto.randomUUID();
      downloads.push(req);

      return {
        id,
        success: true,
        url: `${origin}/${pluginId ?? skillId}/download/${format}`,
        checksum: crypto.randomUUID(),
        size: Math.floor(Math.random() * 1024 * 1024) + 10240
      };
    },

    async queueDownload(req: DownloadRequest): Promise<DownloadResult> {
      return this.prepareDownload(req);
    }
  };
}

// 4. Rate Marketplace Provider
export function createRateMarketplaceProvider(): RateMarketplaceProvider {
  const ratings: Rating[] = [];

  return {
    async submit(pluginId: string | null, skillId: string | null, score: Rating['score'], comment?: string): Promise<Rating> {
      const id = crypto.randomUUID();
      const timestamp = Date.now();

      const rating: Rating = {
        pluginId,
        skillId,
        userId: crypto.randomUUID(),
        score,
        timestamp,
        ...(comment ? { comment } : {})
      };

      ratings.push(rating);
      return rating;
    },

    async getRatings(pluginId: string | null, skillId: string | null): Promise<Rating[]> {
      return ratings.filter(r =>
        (pluginId && r.pluginId === pluginId) ||
        (skillId && r.skillId === skillId)
      );
    }
  };
}

// 5. Install Marketplace Provider
export function createInstallMarketplaceProvider(): InstallMarketplaceProvider {
  const installed: Array<{ id: string; name: string; version: string; installedAt: number }> = [];

  return {
    async install(url: string): Promise<{ success: boolean; path: string; error?: string }> {
      const id = crypto.randomUUID();
      const path = `/opt/data/plugins/${id}`;

      installed.push({
        id,
        name: id,
        version: '1.0.0',
        installedAt: Date.now()
      });

      return { success: true, path };
    },

    async uninstall(path: string): Promise<boolean> {
      const idx = installed.findIndex(p => `/opt/data/plugins/${p.id}` === path);
      if (idx >= 0) {
        installed.splice(idx, 1);
        return true;
      }
      return false;
    },

    async getInstalled(): Promise<Array<{ id: string; name: string; version: string; installedAt: number }>> {
      return installed;
    }
  };
}