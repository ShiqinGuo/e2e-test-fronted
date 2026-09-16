import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Workflow } from 'lucide-react'
import { api } from './api'
import { Button, Input, ErrorNotice, Field, Spinner } from './components/ui'

export function Auth({
  onAuthenticated,
  sessionError,
  retrySession,
  expectedEmail,
}: {
  onAuthenticated: () => Promise<void>
  sessionError?: unknown
  retrySession: () => void
  expectedEmail?: string
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(expectedEmail || '')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api.post(`/api/auth/${mode === 'login' ? 'sign-in' : 'sign-up'}/email`, {
        email,
        password,
        ...(mode === 'register' ? { name } : {}),
      })
      setPassword('')
      await onAuthenticated()
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <Workflow size={27} />
        <span>Flowtest</span>
        <span className="brand-label">测试工作台</span>
      </a>
      <section className="auth-card">
        <div className="auth-heading">
          <h1>{mode === 'login' ? '登录工作台' : '创建账号'}</h1>
          <p>{mode === 'login' ? '继续你的业务流程测试。' : '创建项目，开始录制与验证。'}</p>
        </div>
        <ErrorNotice error={sessionError} retry={retrySession} />
        <form onSubmit={submit} className="stack">
          <ErrorNotice error={error} />
          {mode === 'register' && (
            <Field label="姓名">
              <Input
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}
          <Field label="邮箱">
            <Input
              type="email"
              autoComplete="email"
              required
              readOnly={!!expectedEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="密码" hint={mode === 'register' ? '至少 12 个字符' : undefined}>
            <Input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 12 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button className="auth-submit" type="submit" disabled={pending}>
            {pending ? (
              <Spinner label={mode === 'login' ? '正在登录' : '正在创建'} />
            ) : (
              <>
                {mode === 'login' ? '登录' : '创建账号'}
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>
        {!expectedEmail && (
          <div className="auth-switch">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
                setPassword('')
              }}
              disabled={pending}
            >
              {mode === 'login' ? '创建账号' : '登录'}
            </Button>
          </div>
        )}
      </section>
      <footer className="auth-footer">
        <span>Playwright 驱动</span>
        <span>录制 · 检查 · 执行</span>
      </footer>
    </main>
  )
}
