import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Textarea, ErrorNotice, Field, Modal, Spinner } from './ui'

export function CreateDialog({
  title,
  open,
  onClose,
  onCreate,
  showDescription = true,
}: {
  title: string
  open: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => Promise<void>
  showDescription?: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await onCreate(name.trim(), description.trim())
      setName('')
      setDescription('')
      onClose()
    } catch (error) {
      setError(error)
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal
      title={title}
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose()
      }}
    >
      <form onSubmit={submit}>
        <div className="dialog-body stack">
          <ErrorNotice error={error} />
          <Field label="名称">
            <Input
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          {showDescription && (
            <Field label="备注（选填）">
              <Textarea
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          )}
        </div>
        <footer className="dialog-footer">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            取消
          </Button>
          <Button disabled={pending || !name.trim()}>
            {pending ? <Spinner label="正在创建" /> : '创建'}
          </Button>
        </footer>
      </form>
    </Modal>
  )
}
