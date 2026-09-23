/**
 * Test suite for Phase 13: Marketplace
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  createBrowseMarketplaceProvider,
  createSearchMarketplaceProvider,
  createDownloadMarketplaceProvider,
  createRateMarketplaceProvider,
  createInstallMarketplaceProvider
} from '../src/security/marketplace-providers.js';

// 1. Browse Marketplace Tests
test('T-MKT1: Get popular listings', async () => {
  const bmp = createBrowseMarketplaceProvider();
  const popular = await bmp.getPopular(2);
  assert.strictEqual(popular.length, 2);
  assert.ok(popular[0]?.id);
});

test('T-MKT2: Get all categories', async () => {
  const bmp = createBrowseMarketplaceProvider();
  const categories = await bmp.getCategories();
  assert.ok(categories.includes('documents'));
  assert.ok(categories.includes('development'));
});

test('T-MKT3: Get listings with keyword search', async () => {
  const bmp = createBrowseMarketplaceProvider();
  const listings = await bmp.getListings({ keywords: ['PDF'] });
  assert.strictEqual(listings.length, 1);
  assert.strictEqual(listings[0]?.name, 'PDF Handler');
});

// 2. Search Marketplace Tests
test('T-MKT4: Search with author filter', async () => {
  const smp = createSearchMarketplaceProvider();
  const results = await smp.search({ authors: ['magocofactory'] });
  assert.ok(results.length >= 2);
});

test('T-MKT5: Search with tags', async () => {
  const smp = createSearchMarketplaceProvider();
  const results = await smp.search({ tags: ['git'] });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0]?.name, 'Git Cleanup');
});

test('T-MKT6: Search with limit', async () => {
  const smp = createSearchMarketplaceProvider();
  const results = await smp.search({ limit: 1 });
  assert.strictEqual(results.length, 1);
});

// 3. Download Tests
test('T-MKT7: Prepare download for plugin', async () => {
  const dmp = createDownloadMarketplaceProvider();
  const res = await dmp.prepareDownload({
    id: 'req-1',
    origin: 'https://marketplace.magoco.dev',
    pluginId: 'plg-1',
    format: 'plugin'
  });
  assert.strictEqual(res.success, true);
  assert.ok(res.url?.includes('plg-1/download/plugin'));
  assert.ok(res.checksum);
});

test('T-MKT8: Prepare download fails without IDs', async () => {
  const dmp = createDownloadMarketplaceProvider();
  const res = await dmp.prepareDownload({
    id: 'req-2',
    origin: 'https://marketplace.magoco.dev',
    format: 'skill'
  });
  assert.strictEqual(res.success, false);
  assert.ok(res.error);
});

// 4. Rating Tests
test('T-MKT9: Submit and get ratings for plugin', async () => {
  const rmp = createRateMarketplaceProvider();
  await rmp.submit('plg-1', null, 5, 'Excellent plugin!');
  
  const ratings = await rmp.getRatings('plg-1', null);
  assert.strictEqual(ratings.length, 1);
  assert.strictEqual(ratings[0]?.score, 5);
  assert.strictEqual(ratings[0]?.comment, 'Excellent plugin!');
});

test('T-MKT10: Submit ratings with score constraints', async () => {
  const rmp = createRateMarketplaceProvider();
  const rating = await rmp.submit('plg-2', null, 4);
  assert.strictEqual(rating.score, 4);
  assert.strictEqual(rating.comment, undefined);
});

// 5. Install Tests
test('T-MKT11: One-click install plugin', async () => {
  const imp = createInstallMarketplaceProvider();
  const res = await imp.install('https://marketplace.magoco.dev/downloads/plg-1.tar.gz');
  assert.strictEqual(res.success, true);
  assert.ok(res.path);

  const installed = await imp.getInstalled();
  assert.strictEqual(installed.length, 1);
});

test('T-MKT12: Uninstall plugin by path', async () => {
  const imp = createInstallMarketplaceProvider();
  const res = await imp.install('https://marketplace.magoco.dev/downloads/plg-1.tar.gz');
  assert.strictEqual(res.success, true);

  const uninstalled = await imp.uninstall(res.path);
  assert.strictEqual(uninstalled, true);

  const installed = await imp.getInstalled();
  assert.strictEqual(installed.length, 0);
});
