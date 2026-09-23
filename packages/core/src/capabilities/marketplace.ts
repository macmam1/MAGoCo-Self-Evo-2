/**
 * Marketplace capability definitions — Phase 13
 *
 * Capabilities:
 * - magoco.marketplace.browse (browse plugins/skills)
 * - magoco.marketplace.search (search by tag, author, category)
 * - magoco.marketplace.download (download and install plugins)
 * - magoco.marketplace.rating (rate plugins/skills)
 * - magoco.marketplace.install (one-click install from URL)
 */

import type { CapabilityDef } from './types.js';

export const BROWSE_MARKETPLACE_CAPABILITY = 'magoco.marketplace.browse' as const;
export const SEARCH_MARKETPLACE_CAPABILITY = 'magoco.marketplace.search' as const;
export const DOWNLOAD_MARKETPLACE_CAPABILITY = 'magoco.marketplace.download' as const;
export const RATE_MARKETPLACE_CAPABILITY = 'magoco.marketplace.rating' as const;
export const INSTALL_MARKETPLACE_CAPABILITY = 'magoco.marketplace.install' as const;

// 1. Marketplace Listings
export interface PluginMetadata {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  category: string;
  downloads: {
    total: number;
    last30Days: number;
  };
  rating: {
    average: number;
    count: number;
  };
  license: string;
  metaUrl: string;
}

export interface SkillMetadata {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  category: string;
  downloads: {
    total: number;
    last30Days: number;
  };
  rating: {
    average: number;
    count: number;
  };
}

// 2. Search Filters
export interface SearchFilters {
  tags?: string[];
  authors?: string[];
  categories?: string[];
  keywords?: string[];
  minRating?: number;
  limit?: number;
}

// 3. Download Request
export interface DownloadRequest {
  id: string;
  origin: string;
  pluginId?: string;
  skillId?: string;
  format: 'plugin' | 'skill' | 'framework';
}

export interface DownloadResult {
  id: string;
  success: boolean;
  url?: string;
  checksum?: string;
  size?: number;
  error?: string;
}

// 4. Rating
export interface Rating {
  pluginId: string | null;
  skillId: string | null;
  userId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: number;
}

// Capability Interfaces
export interface BrowseMarketplaceProvider {
  getPopular(limit?: number): Promise<PluginMetadata[] | SkillMetadata[]>;
  getCategories(): Promise<string[]>;
  getListings(filters?: SearchFilters): Promise<(PluginMetadata | SkillMetadata)[]>;
}

export interface SearchMarketplaceProvider {
  search(filters: SearchFilters): Promise<(PluginMetadata | SkillMetadata)[]>;
}

export interface DownloadMarketplaceProvider {
  prepareDownload(req: DownloadRequest): Promise<DownloadResult>;
  queueDownload(req: DownloadRequest): Promise<DownloadResult>;
}

export interface RateMarketplaceProvider {
  submit(pluginId: string | null, skillId: string | null, score: Rating['score'], comment?: string): Promise<Rating>;
  getRatings(pluginId: string | null, skillId: string | null): Promise<Rating[]>;
}

export interface InstallMarketplaceProvider {
  install(url: string): Promise<{ success: boolean; path: string; error?: string }>;
  uninstall(path: string): Promise<boolean>;
  getInstalled(): Promise<Array<{ id: string; name: string; version: string; installedAt: number }>>;
}

// Capability Definitions
export const browseMarketplaceDef: CapabilityDef = {
  id: BROWSE_MARKETPLACE_CAPABILITY,
  name: 'Marketplace Browse',
  description: 'Browse and discover plugins and skills',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const searchMarketplaceDef: CapabilityDef = {
  id: SEARCH_MARKETPLACE_CAPABILITY,
  name: 'Marketplace Search',
  description: 'Search plugins/skills by tags, authors, categories',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const downloadMarketplaceDef: CapabilityDef = {
  id: DOWNLOAD_MARKETPLACE_CAPABILITY,
  name: 'Marketplace Download',
  description: 'Prepare and queue downloads from marketplace',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const rateMarketplaceDef: CapabilityDef = {
  id: RATE_MARKETPLACE_CAPABILITY,
  name: 'Marketplace Rating',
  description: 'Rate plugins/skills with scores and comments',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const installMarketplaceDef: CapabilityDef = {
  id: INSTALL_MARKETPLACE_CAPABILITY,
  name: 'Marketplace Install',
  description: 'One-click install and uninstall plugins from URLs',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};