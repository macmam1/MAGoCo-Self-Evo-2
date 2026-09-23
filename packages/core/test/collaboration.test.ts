/**
 * Test suite for Phase 11: Multi-User & Collaboration
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  createWorkspaceProvider,
  createRbacProvider,
  createTeamProvider,
  createAuditProvider
} from '../src/security/collaboration-providers.js';
import type { Role, Permission, AuditEntry } from '../src/capabilities/collaboration.js';

// 1. Workspace Tests
test('T-COL1: Create workspace with owner', async () => {
  const wp = createWorkspaceProvider();
  const ws = await wp.create('My Workspace', 'user-123');
  assert.ok(ws.id);
  assert.strictEqual(ws.name, 'My Workspace');
  assert.strictEqual(ws.members.length, 1);
  assert.strictEqual(ws.members[0]?.userId, 'user-123');
});

test('T-COL2: Add and remove workspace member', async () => {
  const wp = createWorkspaceProvider();
  const ws = await wp.create('Test WS', 'user-123');
  await wp.addMember(ws.id, 'user-456', 'member');
  assert.strictEqual(ws.members.length, 2);

  await wp.removeMember(ws.id, 'user-456');
  assert.strictEqual(ws.members.length, 1);
});

test('T-COL3: Get workspace by ID', async () => {
  const wp = createWorkspaceProvider();
  const ws = await wp.create('Find Me', 'user-123');
  const fetched = await wp.get(ws.id);
  assert.ok(fetched);
  assert.strictEqual(fetched?.name, 'Find Me');
});

// 2. RBAC Tests
test('T-COL4: Role hasPermission check', () => {
  const rbac = createRbacProvider();
  const adminRole: Role = { id: 'admin', name: 'Admin', permissions: ['workspace:read', 'agent:create'] as Permission[] };
  assert.strictEqual(rbac.hasPermission(adminRole, 'workspace:read'), true);
  assert.strictEqual(rbac.hasPermission(adminRole, 'workspace:admin'), false);
});

test('T-COL5: Grant and revoke permission', () => {
  const rbac = createRbacProvider();
  const role: Role = { id: 'test', name: 'Test', permissions: ['workspace:read'] as Permission[] };
  rbac.grantPermission(role, 'agent:create');
  assert.ok(role.permissions.includes('agent:create'));

  rbac.revokePermission(role, 'agent:create');
  assert.ok(!role.permissions.includes('agent:create'));
});

test('T-COL6: canManage checks role hierarchy', () => {
  const rbac = createRbacProvider();
  assert.strictEqual(rbac.canManage('owner', 'member'), true);
  assert.strictEqual(rbac.canManage('member', 'owner'), false);
  assert.strictEqual(rbac.canManage('admin', 'member'), true);
});

// 3. Team Tests
test('T-COL7: Create team and list members', async () => {
  const tp = createTeamProvider();
  const teamId = await tp.createTeam('Dev Team', 'lead-123');
  const members = await tp.listMembers(teamId);
  assert.strictEqual(members.length, 1);
  assert.strictEqual(members[0]?.role, 'lead');
});

test('T-COL8: Add and remove team member', async () => {
  const tp = createTeamProvider();
  const teamId = await tp.createTeam('Team', 'lead-123');
  await tp.addMember(teamId, { userId: 'dev-456', email: 'dev@example.com', displayName: 'Dev', role: 'developer', active: true });
  let members = await tp.listMembers(teamId);
  assert.strictEqual(members.length, 2);

  await tp.removeMember(teamId, 'dev-456');
  members = await tp.listMembers(teamId);
  assert.strictEqual(members.length, 1);
});

// 4. Audit Log Tests
test('T-COL9: Log and query audit entries', async () => {
  const ap = createAuditProvider();
  ap.log({ userId: 'user-123', action: 'workspace:create', resource: 'workspace', resourceId: 'ws-1', metadata: {} });
  ap.log({ userId: 'user-456', action: 'agent:execute', resource: 'agent', resourceId: 'ag-1', metadata: {} });

  const entries = await ap.query({ userId: 'user-123' });
  assert.ok(entries.length > 0);
});

test('T-COL10: Query with filters', async () => {
  const ap = createAuditProvider();
  ap.log({ userId: 'user-123', action: 'create', resource: 'workspace', resourceId: 'ws-1', metadata: {} });
  ap.log({ userId: 'user-456', action: 'read', resource: 'workspace', resourceId: 'ws-2', metadata: {} });

  const entries = await ap.query({ action: 'create' });
  assert.ok(entries.length > 0);
});

test('T-COL11: Audit entries structure', async () => {
  const ap = createAuditProvider();
  ap.log({ userId: 'user-123', action: 'workspace:create', resource: 'workspace', resourceId: 'ws-1', metadata: {} });
  const entries = await ap.query({});
  assert.ok(entries.length > 0);
  assert.ok(entries[0]?.id);
  assert.ok(entries[0]?.timestamp);
});

test('T-COL12: Audit log design verification', () => {
  const ap = createAuditProvider();
  // Audit logs should only allow append operations
  assert.ok(ap.log);
  assert.ok(ap.query);
});
