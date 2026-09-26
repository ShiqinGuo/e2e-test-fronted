import { describe, expect, it } from 'vitest'
import { assignableRoles, canEditResources, canManageMember } from './permissions'
import { invitationToken } from './InvitationGate'

describe('organization permission presentation', () => {
  it('viewer cannot modify tests, and admin cannot grant or edit higher roles', () => {
    expect(canEditResources('viewer')).toBe(false)
    expect(canEditResources('member')).toBe(true)
    expect(canManageMember('admin', 'owner')).toBe(false)
    expect(canManageMember('admin', 'admin')).toBe(false)
    expect(assignableRoles('admin')).toEqual(['member', 'viewer'])
    expect(canManageMember('member', 'viewer')).toBe(false)
  })
  it('only reads invite secrets from the fragment, never the query', () => {
    expect(invitationToken('https://test.example/join#token=abc123')).toBe('abc123')
    expect(invitationToken('https://test.example/join?token=abc123')).toBe('')
    expect(invitationToken('not a link')).toBe('')
  })
})
