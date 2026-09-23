/**
 * Multi-user & Collaboration capability definitions — Phase 11
 *
 * Capabilities:
 * - magoco.workspace (multi-tenant workspaces)
 * - magoco.rbac (role-based access control)
 * - magoco.team (team management)
 * - magoco.audit (immutable audit log)
 */

import type { CapabilityDef } from './types.js';

export const WORKSPACE_CAPABILITY = 'magoco.workspace' as const;
export const RBAC_CAPABILITY = 'magoco.rbac' as const;
export const TEAM_CAPABILITY = 'magoco.team' as const;
export const AUDIT_CAPABILITY = 'magoco.audit' as const;

// 1. Workspace Interfaces
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: number;
  settings: Record<string, unknown>;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: number;
}

export interface WorkspaceProvider {
  create(name: string, ownerId: string): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  update(id: string, updates: Partial<Workspace>): Promise<void>;
  delete(id: string): Promise<void>;
  addMember(workspaceId: string, userId: string, role: WorkspaceMember['role']): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
}

// 2. RBAC Interfaces
export type Permission =
  | 'workspace:read' | 'workspace:write' | 'workspace:admin'
  | 'agent:create' | 'agent:delete' | 'agent:execute'
  | 'workflow:create' | 'workflow:edit' | 'workflow:run' | 'workflow:delete'
  | 'file:read' | 'file:write' | 'file:delete'
  | 'settings:manage' | 'members:manage' | 'billing:access';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface RbacProvider {
  hasPermission(role: Role, permission: Permission): boolean;
  grantPermission(role: Role, permission: Permission): Role;
  revokePermission(role: Role, permission: Permission): Role;
  canManage(memberRole: WorkspaceMember['role'], targetRole: WorkspaceMember['role']): boolean;
}

// 3. Team Management Interfaces
export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'lead' | 'developer' | 'reviewer' | 'observer';
  active: boolean;
}

export interface TeamProvider {
  createTeam(name: string, ownerId: string): Promise<string>;
  addMember(teamId: string, member: TeamMember): Promise<void>;
  removeMember(teamId: string, userId: string): Promise<void>;
  updateRole(teamId: string, userId: string, role: TeamMember['role']): Promise<void>;
  listMembers(teamId: string): Promise<TeamMember[]>;
}

// 4. Audit Log Interfaces
export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditProvider {
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
  query(filters: AuditFilters): Promise<AuditEntry[]>;
  getById(id: string): Promise<AuditEntry | null>;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// Capability Definitions
export const workspaceDef: CapabilityDef = {
  id: WORKSPACE_CAPABILITY,
  name: 'Multi-Tenant Workspaces',
  description: 'Isolated workspaces with member management',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const rbacDef: CapabilityDef = {
  id: RBAC_CAPABILITY,
  name: 'RBAC',
  description: 'Role-based access control',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const teamDef: CapabilityDef = {
  id: TEAM_CAPABILITY,
  name: 'Team Management',
  description: 'Team creation, member roles, invitations',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};

export const auditDef: CapabilityDef = {
  id: AUDIT_CAPABILITY,
  name: 'Audit Log',
  description: 'Immutable audit trail for compliance',
  version: '0.1.0',
  create(_config, _ctx) { throw new Error('Provider not registered'); }
};