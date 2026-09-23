/**
 * In-memory providers for Phase 11: Multi-User & Collaboration
 */

import * as crypto from 'node:crypto';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceProvider,
  Role,
  Permission,
  RbacProvider,
  TeamMember,
  TeamProvider,
  AuditEntry,
  AuditProvider,
  AuditFilters
} from '../capabilities/collaboration.js';

// 1. Workspace Provider
export function createWorkspaceProvider(): WorkspaceProvider {
  const workspaces = new Map<string, Workspace>();

  return {
    async create(name: string, ownerId: string): Promise<Workspace> {
      const id = crypto.randomUUID();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      const workspace: Workspace = {
        id,
        name,
        slug,
        ownerId,
        members: [{ userId: ownerId, role: 'owner', joinedAt: Date.now() }],
        createdAt: Date.now(),
        settings: {}
      };
      workspaces.set(id, workspace);
      return workspace;
    },

    async get(id: string): Promise<Workspace | null> {
      return workspaces.get(id) ?? null;
    },

    async update(id: string, updates: Partial<Workspace>): Promise<void> {
      const ws = workspaces.get(id);
      if (ws) Object.assign(ws, updates);
    },

    async delete(id: string): Promise<void> {
      workspaces.delete(id);
    },

    async addMember(workspaceId: string, userId: string, role: WorkspaceMember['role']): Promise<void> {
      const ws = workspaces.get(workspaceId);
      if (!ws) return;
      ws.members.push({ userId, role, joinedAt: Date.now() });
    },

    async removeMember(workspaceId: string, userId: string): Promise<void> {
      const ws = workspaces.get(workspaceId);
      if (!ws) return;
      ws.members = ws.members.filter(m => m.userId !== userId);
    }
  };
}

// 2. RBAC Provider
export function createRbacProvider(): RbacProvider {
  const defaultRoles = new Map<string, Role>([
    ['admin', { id: 'admin', name: 'Administrator', permissions: ['workspace:read', 'workspace:write', 'workspace:admin', 'agent:create', 'agent:delete', 'agent:execute', 'workflow:create', 'workflow:edit', 'workflow:run', 'workflow:delete', 'file:read', 'file:write', 'file:delete', 'settings:manage', 'members:manage', 'billing:access'] }],
    ['member', { id: 'member', name: 'Member', permissions: ['workspace:read', 'workspace:write', 'agent:execute', 'workflow:run', 'file:read', 'file:write'] }],
    ['viewer', { id: 'viewer', name: 'Viewer', permissions: ['workspace:read', 'file:read'] }]
  ]);

  return {
    hasPermission(role: Role, permission: Permission): boolean {
      return role.permissions.includes(permission);
    },

    grantPermission(role: Role, permission: Permission): Role {
      if (!role.permissions.includes(permission)) {
        role.permissions.push(permission);
      }
      return role;
    },

    revokePermission(role: Role, permission: Permission): Role {
      role.permissions = role.permissions.filter(p => p !== permission);
      return role;
    },

    canManage(memberRole: WorkspaceMember['role'], targetRole: WorkspaceMember['role']): boolean {
      const hierarchy: Record<WorkspaceMember['role'], number> = {
        owner: 3,
        admin: 2,
        member: 1,
        viewer: 0
      };
      return hierarchy[memberRole] > hierarchy[targetRole];
    }
  };
}

// 3. Team Provider
export function createTeamProvider(): TeamProvider {
  const teams = new Map<string, TeamMember[]>();

  return {
    async createTeam(name: string, ownerId: string): Promise<string> {
      const id = crypto.randomUUID();
      teams.set(id, [{
        userId: ownerId,
        email: `${ownerId}@example.com`,
        displayName: ownerId,
        role: 'lead',
        active: true
      }]);
      return id;
    },

    async addMember(teamId: string, member: TeamMember): Promise<void> {
      const existing = teams.get(teamId);
      if (existing) {
        existing.push(member);
      }
    },

    async removeMember(teamId: string, userId: string): Promise<void> {
      const existing = teams.get(teamId);
      if (existing) {
        const idx = existing.findIndex(m => m.userId === userId);
        if (idx >= 0) existing.splice(idx, 1);
      }
    },

    async updateRole(teamId: string, userId: string, role: TeamMember['role']): Promise<void> {
      const existing = teams.get(teamId);
      if (existing) {
        const member = existing.find(m => m.userId === userId);
        if (member) member.role = role;
      }
    },

    async listMembers(teamId: string): Promise<TeamMember[]> {
      return teams.get(teamId) ?? [];
    }
  };
}

// 4. Audit Provider
export function createAuditProvider(): AuditProvider {
  const entries = new Map<string, AuditEntry>();

  return {
    log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
      const id = crypto.randomUUID();
      const timestamp = Date.now();
      entries.set(id, { ...entry, id, timestamp });
    },

    query(filters: AuditFilters): Promise<AuditEntry[]> {
      const all = Array.from(entries.values());
      const filtered = all.filter(entry => {
        if (filters.userId && entry.userId !== filters.userId) return false;
        if (filters.action && entry.action !== filters.action) return false;
        if (filters.resource && entry.resource !== filters.resource) return false;
        if (filters.startTime && entry.timestamp < filters.startTime) return false;
        if (filters.endTime && entry.timestamp > filters.endTime) return false;
        return true;
      });
      return Promise.resolve(filters.limit ? filtered.slice(0, filters.limit) : filtered);
    },

    async getById(id: string): Promise<AuditEntry | null> {
      return entries.get(id) ?? null;
    }
  };
}
