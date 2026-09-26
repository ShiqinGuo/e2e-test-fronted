import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Modal } from '../components/ui'

interface Guard {
  dirty: boolean
  setDirty: (value: boolean) => void
  setBusy: (value: boolean) => void
  guard: (action: () => void) => void
}
const Context = createContext<Guard | null>(null)
export function useDraftGuard() {
  const value = useContext(Context)
  if (!value) throw new Error('DraftGuardProvider is required')
  return value
}
export function DraftGuardProvider({ children }: { children: ReactNode }) {
  const [dirty, updateDirty] = useState(false)
  const dirtyRef = useRef(false)
  const busyRef = useRef(false)
  const [next, setNext] = useState<{ action: () => void } | null>(null)
  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value
    updateDirty(value)
  }, [])
  const setBusy = useCallback((value: boolean) => {
    busyRef.current = value
  }, [])
  const guard = useCallback((action: () => void) => {
    if (busyRef.current) return
    if (dirtyRef.current) setNext({ action })
    else action()
  }, [])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || busyRef.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])
  return (
    <Context.Provider value={{ dirty, setDirty, setBusy, guard }}>
      {children}
      <Modal
        title="未保存的修改"
        description="切换后将放弃当前草稿，已保存的版本仍然保留。"
        open={!!next}
        onOpenChange={(open) => {
          if (!open) setNext(null)
        }}
      >
        <footer className="dialog-footer">
          <Button variant="outline" onClick={() => setNext(null)}>
            继续编辑
          </Button>
          <Button
            onClick={() => {
              const action = next?.action
              setNext(null)
              setDirty(false)
              action?.()
            }}
          >
            放弃草稿并继续
          </Button>
        </footer>
      </Modal>
    </Context.Provider>
  )
}
