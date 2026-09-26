import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, LogOut, Plus, Users } from 'lucide-react'
import { api } from '../api'
import type { Invitation, Member, Organization, OrganizationRole, User } from '../types'
import { Button, Empty, ErrorNotice, Field, Input, Modal, SelectControl, Spinner } from '../components/ui'
import { assignableRoles, canManageMember, canManageOrganization, roleLabels } from './permissions'

export function OrganizationSettings({
  organization,
  user,
  onLeft,
}: {
  organization: Organization
  user: User
  onLeft: () => void
}) {
  const client = useQueryClient()
  const base = `/organizations/${organization.id}`
  const manage = canManageOrganization(organization.role)
  const members = useQuery({
    queryKey: ['members', organization.id],
    queryFn: ({ signal }) => api.list<Member>(`${base}/members`, signal),
  })
  const invitations = useQuery({
    queryKey: ['invitations', organization.id],
    queryFn: ({ signal }) => api.list<Invitation>(`${base}/invitations`, signal),
    enabled: manage,
  })
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member')
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const [remove, setRemove] = useState<Member | null>(null)
  async function perform(action: () => Promise<unknown>) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await action()
      await Promise.all([
        client.invalidateQueries({ queryKey: ['members', organization.id] }),
        client.invalidateQueries({ queryKey: ['invitations', organization.id] }),
        client.invalidateQueries({ queryKey: ['organizations'] }),
      ])
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  async function invite(event: FormEvent) {
    event.preventDefault()
    await perform(async () => {
      const result = await api.post<{ invitation: Invitation; inviteUrl: string }>(`${base}/invitations`, {
        email: email.trim(),
        role: inviteRole,
      })
      setInviteUrl(result.inviteUrl)
      setCopied(false)
      setEmail('')
    })
  }
  return (
    <section className="organization-settings">
      <header className="settings-heading">
        <div>
          <h1>成员与权限</h1>
          <p>{organization.name} · 成员权限适用于组织内所有工作区</p>
        </div>
        <span className="badge">{roleLabels[organization.role]}</span>
      </header>
      <ErrorNotice error={error || members.error || invitations.error} />
      {manage && (
        <form className="invitation-form" onSubmit={invite}>
          <Field label="邀请邮箱">
            <Input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="加入角色">
            <SelectControl
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as OrganizationRole)}
              options={assignableRoles(organization.role)
                .filter((r) => r !== 'owner')
                .map((value) => ({ value, label: roleLabels[value] }))}
            />
          </Field>
          <Button disabled={pending}>
            <Plus size={15} />
            生成邀请链接
          </Button>
        </form>
      )}
      {inviteUrl && manage && (
        <div className="invite-result">
          <p role="status">邀请已创建，请将链接发送给受邀人。</p>
          <div className="inline">
            <Input aria-label="邀请链接" readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  .writeText(inviteUrl)
                  .then(() => setCopied(true))
                  .catch(() => setError(new Error('复制失败，请选中链接手动复制。')))
              }}
            >
              <Copy size={14} />
              {copied ? '已复制' : '复制链接'}
            </Button>
          </div>
        </div>
      )}
      <div className="members-table">
        <div className="members-table-head">
          <span>成员</span>
          <span>组织角色</span>
          <span />
        </div>
        {members.isPending ? (
          <Spinner label="加载成员" />
        ) : (
          members.data?.map((member) => (
            <div className="member-row" key={member.userId}>
              <div className="member-identity">
                <span className="avatar">{member.name.slice(0, 1)}</span>
                <div>
                  <strong>
                    {member.name}
                    {member.userId === user.id && <small>（你）</small>}
                  </strong>
                  <span>{member.email}</span>
                </div>
              </div>
              {canManageMember(organization.role, member.role) ? (
                <SelectControl
                  aria-label={`${member.email} 的角色`}
                  value={member.role}
                  disabled={pending}
                  onValueChange={(role) =>
                    void perform(() => api.patch(`${base}/members/${member.userId}`, { role }))
                  }
                  options={assignableRoles(organization.role).map((value) => ({
                    value,
                    label: roleLabels[value],
                  }))}
                />
              ) : (
                <span className="muted">{roleLabels[member.role]}</span>
              )}
              {(member.userId === user.id || canManageMember(organization.role, member.role)) && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRemove(member)}>
                  {member.userId === user.id ? (
                    <>
                      <LogOut size={14} />
                      退出
                    </>
                  ) : (
                    '移除'
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      {manage && (
        <section className="pending-invitations">
          <h2>邀请记录</h2>
          {invitations.isPending ? (
            <Spinner />
          ) : !invitations.data?.length ? (
            <Empty icon={Users} title="暂无邀请" description="邀请同事后，在这里查看加入状态。" />
          ) : (
            invitations.data.map((invitation) => (
              <div className="invitation-row" key={invitation.id}>
                <span>{invitation.email}</span>
                <span>{roleLabels[invitation.role]}</span>
                <span>
                  {
                    { pending: '等待加入', accepted: '已加入', revoked: '已撤销', expired: '已过期' }[
                      invitation.status
                    ]
                  }
                </span>
                {invitation.status === 'pending' && canManageMember(organization.role, invitation.role) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void perform(() => api.delete(`${base}/invitations/${invitation.id}`))}
                  >
                    撤销邀请
                  </Button>
                )}
              </div>
            ))
          )}
        </section>
      )}
      <Modal
        title={remove?.userId === user.id ? '退出组织' : '移除成员'}
        description={
          remove?.userId === user.id
            ? '退出后将不能访问这个组织的工作区和测试资源。'
            : `移除后，${remove?.name || ''} 将失去这个组织的访问权限。`
        }
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !pending) setRemove(null)
        }}
      >
        <div className="dialog-body">
          <ErrorNotice error={error} />
        </div>
        <footer className="dialog-footer">
          <Button variant="outline" disabled={pending} onClick={() => setRemove(null)}>
            取消
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              void perform(async () => {
                if (!remove) return
                await api.delete(`${base}/members/${remove.userId}`)
                setRemove(null)
                if (remove.userId === user.id) {
                  client.setQueryData<Organization[]>(['organizations'], (current) =>
                    current?.filter((item) => item.id !== organization.id),
                  )
                  onLeft()
                }
              })
            }
          >
            确认{remove?.userId === user.id ? '退出' : '移除'}
          </Button>
        </footer>
      </Modal>
    </section>
  )
}
