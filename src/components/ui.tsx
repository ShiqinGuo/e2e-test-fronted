import { AlertCircle, Box, Check, ChevronDown, LoaderCircle } from 'lucide-react'
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { ComponentProps, ComponentType, ReactElement, ReactNode } from 'react'
import { ApiError, errorMessage } from '../api'
import { cn } from '../lib/utils'
import { Button } from './primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './primitives/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/select'
import { Popover, PopoverContent, PopoverTrigger } from './primitives/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './primitives/command'
import { Tooltip, TooltipContent, TooltipTrigger } from './primitives/tooltip'
export { Button }
export { Input } from './primitives/input'
export { Textarea } from './primitives/textarea'
export { Popover, PopoverContent, PopoverTrigger }
export { TooltipProvider } from './primitives/tooltip'

export const ModalSuspendedContext = createContext(false)

export function Hint({ label, children }: { label: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  )
}

export function IconButton({ label, children, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Hint label={label}>
      <Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>
        {children}
      </Button>
    </Hint>
  )
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}
export interface SelectControlProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
  'aria-describedby'?: string
}
const EMPTY_VALUE = '__flowtest_empty_value__'
export function SelectControl({
  value,
  onValueChange,
  options,
  placeholder = '请选择',
  ...props
}: SelectControlProps) {
  const [open, setOpen] = useState(false)
  const suspended = useContext(ModalSuspendedContext)
  useEffect(() => {
    if (suspended || props.disabled) setOpen(false)
  }, [suspended, props.disabled])
  const mappedValue = value || (options.some((option) => option.value === '') ? EMPTY_VALUE : '')
  return (
    <Select
      value={mappedValue}
      onValueChange={(next) => {
        if (!props.disabled && !suspended) onValueChange(next === EMPTY_VALUE ? '' : next)
      }}
      open={open && !suspended && !props.disabled}
      onOpenChange={setOpen}
      disabled={props.disabled}
    >
      <SelectTrigger {...props} className={cn('control-select', props.className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={12}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value || EMPTY_VALUE} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Supabase fixed Combobox example adapted to real project/environment data. */
export function SearchSelect({
  value,
  onValueChange,
  options,
  placeholder = '请选择',
  searchPlaceholder = '搜索…',
  ...props
}: SelectControlProps & { searchPlaceholder?: string }) {
  const [open, setOpen] = useState(false)
  const suspended = useContext(ModalSuspendedContext)
  useEffect(() => {
    if (suspended || props.disabled) setOpen(false)
  }, [suspended, props.disabled])
  const selected = options.find((option) => option.value === value)
  return (
    <Popover open={open && !suspended && !props.disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open && !suspended && !props.disabled}
          {...props}
          className={cn('search-select', props.className)}
        >
          <span className="select-text">{selected?.label || placeholder}</span>
          <ChevronDown size={16} className="select-chevron" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="search-select-content p-0"
        onCloseAutoFocus={(event) => {
          if (suspended) event.preventDefault()
        }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>没有匹配的选项</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value || EMPTY_VALUE}
                  keywords={[option.label, option.description || '']}
                  disabled={option.disabled || props.disabled}
                  onSelect={() => {
                    if (props.disabled || suspended) return
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    size={16}
                    className={cn('shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="search-option-text">
                    <span>{option.label}</span>
                    {option.description && <small>{option.description}</small>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function Spinner({ label = '加载中' }: { label?: string }) {
  return (
    <span className="loading" role="status">
      <LoaderCircle size={16} className="spin" aria-hidden="true" />
      {label}
    </span>
  )
}

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={17} aria-hidden="true" />
      <div>
        <span>{errorMessage(error)}</span>
        {error instanceof ApiError && error.requestId && <small>请求编号：{error.requestId}</small>}
      </div>
      {retry && (
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          重试
        </Button>
      )}
    </div>
  )
}

export function Empty({
  title,
  description,
  icon: Icon = Box,
  children,
}: {
  title: string
  description?: string
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>
  children?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={30} strokeWidth={1.4} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}

export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
  wide = false,
}: {
  title: string
  description?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  wide?: boolean
}) {
  const suspended = useContext(ModalSuspendedContext)
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  // Capture the trigger before its click opens the controlled dialog. Child
  // autoFocus can run before Radix's onOpenAutoFocus; suspended dialogs must
  // retain this original target across reauthentication.
  useEffect(() => {
    const rememberOpener = (event: FocusEvent) => {
      if (
        !open &&
        !suspended &&
        event.target instanceof HTMLElement &&
        event.target !== document.body &&
        !event.target.closest('[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]')
      )
        opener.current = event.target
    }
    document.addEventListener('focusin', rememberOpener)
    return () => document.removeEventListener('focusin', rememberOpener)
  }, [open, suspended])
  return (
    <Dialog open={open && !suspended} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('flow-dialog', wide && 'flow-dialog-wide')}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          if (suspended) event.preventDefault()
          else if (opener.current?.isConnected) {
            event.preventDefault()
            opener.current.focus()
          }
        }}
      >
        <DialogHeader className="dialog-header">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
            id,
            ...(hint ? { 'aria-describedby': `${id}-hint` } : {}),
          })
        : children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  )
}
