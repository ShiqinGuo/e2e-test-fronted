import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Workflow } from 'lucide-react'
import { api, pauseSessionRequests } from './api'
import type { Organization, Session, User } from './types'
import { Auth } from './Auth'
import { ModalSuspendedContext, Spinner } from './components/ui'
import { Application } from './app/Application'
import { DraftGuardProvider } from './app/DraftGuard'
import { InvitationGate, invitationToken } from './organizations/InvitationGate'

export function App() {
  const client = useQueryClient()
  const [inviteToken, setInviteToken] = useState(() => invitationToken(window.location.href))
  const [user, setUser] = useState<User | null>(null)
  const [expired, setExpired] = useState(false)
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<Session | null>('/api/auth/get-session'),
    staleTime: 60_000,
    retry: false,
    enabled: !expired,
  })
  useEffect(() => {
    const onExpired = () => {
      pauseSessionRequests(true)
      setExpired(true)
      void client.cancelQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
    }
    window.addEventListener('session-expired', onExpired)
    return () => window.removeEventListener('session-expired', onExpired)
  }, [client])
  useEffect(() => {
    if (session.data && !user) setUser(session.data.user)
    if (session.data === null && user && !session.isFetching) {
      pauseSessionRequests(true)
      setExpired(true)
    }
  }, [session.data, session.isFetching, user])
  async function authenticated() {
    const result = await session.refetch()
    if (result.error) throw result.error
    if (!result.data) throw new Error('会话未能建立，请重试登录。')
    if (user && result.data.user.id !== user.id) throw new Error('请使用原账号重新登录，以恢复当前草稿。')
    pauseSessionRequests(false)
    setUser(result.data.user)
    setExpired(false)
    await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
  }
  function signedOut() {
    pauseSessionRequests(false)
    setUser(null)
    setExpired(false)
    client.clear()
    client.setQueryData(['session'], null)
  }
  if (session.isPending && !user)
    return (
      <div className="boot">
        <Workflow size={30} />
        <Spinner label="正在恢复会话" />
      </div>
    )
  const current = user || session.data?.user
  if (!current)
    return (
      <Auth
        sessionError={session.error}
        retrySession={() => session.refetch()}
        onAuthenticated={authenticated}
      />
    )
  return (
    <>
      <div className="session-workspace" inert={expired}>
        <ModalSuspendedContext.Provider value={expired}>
          {inviteToken ? (
            <InvitationGate
              token={inviteToken}
              user={current}
              onAccepted={(organization: Organization) => {
                window.history.replaceState(
                  null,
                  '',
                  `/?organization=${organization.id}&workspace=${organization.defaultWorkspaceId}`,
                )
                setInviteToken('')
              }}
              onDismiss={() => {
                window.history.replaceState(null, '', '/')
                setInviteToken('')
              }}
              onSignOut={async () => {
                await api.post('/api/auth/sign-out')
                signedOut()
              }}
            />
          ) : (
            <DraftGuardProvider>
              <Application
                key={current.id}
                user={current}
                onJoin={(token) => {
                  window.history.replaceState(null, '', `/join#token=${encodeURIComponent(token)}`)
                  setInviteToken(token)
                }}
                onSignedOut={signedOut}
              />
            </DraftGuardProvider>
          )}
        </ModalSuspendedContext.Provider>
      </div>
      {expired && (
        <div className="session-reauth">
          <Auth
            expectedEmail={current.email}
            sessionError={new Error('会话已过期。当前草稿已保留，重新登录后继续。')}
            retrySession={() => {
              void authenticated().catch(() => undefined)
            }}
            onAuthenticated={authenticated}
          />
        </div>
      )}
    </>
  )
}
