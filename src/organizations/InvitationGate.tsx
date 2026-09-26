import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { api } from '../api'
import type { InvitationPreview, Organization, User } from '../types'
import { Button, ErrorNotice, Spinner } from '../components/ui'
import { roleLabels } from './permissions'

export function invitationToken(value: string) {
  try {
    return new URLSearchParams(new URL(value).hash.slice(1)).get('token') || ''
  } catch {
    return ''
  }
}
export function InvitationGate({
  token,
  user,
  onAccepted,
  onDismiss,
  onSignOut,
}: {
  token: string
  user: User
  onAccepted: (organization: Organization) => void
  onDismiss: () => void
  onSignOut: () => Promise<void>
}) {
  const client = useQueryClient()
  // The secret token is deliberately excluded from cache keys and request URLs.
  const preview = useQuery({
    queryKey: ['invitation-preview'],
    queryFn: () => api.post<InvitationPreview>('/invitations/preview', { token }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function accept() {
    setPending(true)
    setError(null)
    try {
      const organization = await api.post<Organization>('/invitations/accept', { token })
      await client.invalidateQueries({ queryKey: ['organizations'] })
      onAccepted(organization)
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  const data = preview.data
  const matchesEmail = data?.email.toLowerCase() === user.email.toLowerCase()
  const usable = data?.status === 'pending' || data?.status === 'accepted'
  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <Building2 size={30} />
        <h1>加入组织</h1>
        <ErrorNotice error={error || preview.error} retry={() => void preview.refetch()} />
        {preview.isPending ? (
          <Spinner label="正在检查邀请" />
        ) : (
          data && (
            <>
              <p>
                邀请你以<strong>{roleLabels[data.role]}</strong>身份加入{' '}
                <strong>{data.organizationName}</strong>。
              </p>
              <dl className="key-value">
                <dt>受邀邮箱</dt>
                <dd>{data.email}</dd>
                <dt>当前账号</dt>
                <dd>{user.email}</dd>
                <dt>有效期至</dt>
                <dd>{new Date(data.expiresAt).toLocaleString('zh-CN')}</dd>
              </dl>
              {!usable ? (
                <p role="status">邀请已过期或撤销，请联系组织管理员获取新链接。</p>
              ) : !matchesEmail ? (
                <>
                  <p role="status">请使用受邀邮箱登录后接受邀请。</p>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => void onSignOut().catch(setError)}
                  >
                    切换账号
                  </Button>
                </>
              ) : (
                <Button disabled={pending} onClick={() => void accept()}>
                  {pending ? <Spinner label="正在加入" /> : '接受邀请并加入'}
                </Button>
              )}
            </>
          )
        )}
        <Button variant="ghost" disabled={pending} onClick={onDismiss}>
          暂不加入，返回工作台
        </Button>
      </section>
    </main>
  )
}
