import type { OrganizationRole } from '../types'

export const roleLabels: Record<OrganizationRole, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
  viewer: '只读成员',
}
export const canEditResources = (role: OrganizationRole) => role !== 'viewer'
export const canManageOrganization = (role: OrganizationRole) => role === 'owner' || role === 'admin'
export const canManageMember = (actor: OrganizationRole, target: OrganizationRole) =>
  actor === 'owner' || (actor === 'admin' && (target === 'member' || target === 'viewer'))
export const assignableRoles = (actor: OrganizationRole): OrganizationRole[] =>
  actor === 'owner' ? ['owner', 'admin', 'member', 'viewer'] : actor === 'admin' ? ['member', 'viewer'] : []
