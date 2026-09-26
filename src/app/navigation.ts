import { useCallback, useEffect, useRef, useState } from 'react'

export type View = 'scenarios' | 'runs' | 'environments' | 'members'
export interface LocationState {
  organization: string
  workspace: string
  project: string
  view: View
  scenario: string
  run: string
  environment: string
  recording: string
}
export function readLocation(search: string): LocationState {
  const params = new URLSearchParams(search)
  const view = params.get('view')
  return {
    organization: params.get('organization') || '',
    workspace: params.get('workspace') || '',
    project: params.get('project') || '',
    view: view === 'runs' || view === 'environments' || view === 'members' ? view : 'scenarios',
    scenario: params.get('scenario') || '',
    run: params.get('run') || '',
    environment: params.get('environment') || '',
    recording: params.get('recording') || '',
  }
}
export function locationUrl(location: LocationState) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(location)) {
    if (value && !(key === 'view' && value === 'scenarios')) params.set(key, value)
  }
  return `/${params.size ? `?${params}` : ''}${window.location.hash}`
}

/** One URL state for navigation; drafts and permission checks live outside it. */
export function useNavigation(guard: (action: () => void) => void) {
  const [location, setLocation] = useState(() => readLocation(window.location.search))
  const current = useRef(location)
  current.current = location
  const historyIndex = useRef<number>(window.history.state?.flowtestIndex ?? 0)
  const restoring = useRef(false)
  const accepting = useRef(false)
  useEffect(() => {
    window.history.replaceState({ flowtestIndex: historyIndex.current }, '', window.location.href)
  }, [])
  const navigate = useCallback(
    (patch: Partial<LocationState>, replace = false) => {
      const next = { ...current.current, ...patch }
      const commit = () => {
        if (!replace) historyIndex.current += 1
        window.history[replace ? 'replaceState' : 'pushState'](
          { flowtestIndex: historyIndex.current },
          '',
          locationUrl(next),
        )
        current.current = next
        setLocation(next)
      }
      if (replace) commit()
      else guard(commit)
    },
    [guard],
  )
  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      if (restoring.current) {
        restoring.current = false
        return
      }
      const next = readLocation(window.location.search)
      const nextIndex = event.state?.flowtestIndex ?? 0
      if (accepting.current) {
        accepting.current = false
        historyIndex.current = nextIndex
        current.current = next
        setLocation(next)
        return
      }
      const distance = historyIndex.current - nextIndex
      let committed = false
      let deferred = false
      guard(() => {
        committed = true
        if (deferred) {
          accepting.current = true
          window.history.go(-distance)
        } else {
          historyIndex.current = nextIndex
          current.current = next
          setLocation(next)
        }
      })
      if (!committed) {
        deferred = true
        restoring.current = true
        window.history.go(distance)
      }
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [guard])
  return { location, navigate }
}

export const clearProject = { project: '', scenario: '', run: '', environment: '', recording: '' }
