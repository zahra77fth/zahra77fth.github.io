import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../design-system'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  name: string
  label: string
  placeholder: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
}

export function Select({
  id: idProp,
  name,
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  className,
}: SelectProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const listboxId = `${id}-listbox`
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected?.label ?? placeholder

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (!open) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, options.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      }
      if (e.key === 'Enter' && highlight >= 0) {
        e.preventDefault()
        onChange(options[highlight].value)
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, highlight, options, onChange])

  useEffect(() => {
    if (open && highlight >= 0) {
      listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlight, open])

  const openList = () => {
    setOpen(true)
    const idx = options.findIndex((o) => o.value === value)
    setHighlight(idx >= 0 ? idx : 0)
  }

  return (
    <div ref={rootRef} className={cn('ds-select', className)}>
      <input type="hidden" name={name} value={value} required={required} />

      <label id={`${id}-label`} htmlFor={`${id}-trigger`} className="ds-select__label">
        {label}
      </label>

      <button
        id={`${id}-trigger`}
        type="button"
        className={cn('ds-select__trigger', open && 'ds-select__trigger--open', !value && 'ds-select__trigger--placeholder')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${id}-label`}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="ds-select__value truncate">{display}</span>
        <span className={cn('ds-select__chevron', open && 'ds-select__chevron--open')} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="ds-select__menu"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value
            const isHighlighted = i === highlight
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'ds-select__option',
                    isSelected && 'ds-select__option--selected',
                    isHighlighted && 'ds-select__option--highlight',
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="ds-select__option-label">{option.label}</span>
                  {isSelected && (
                    <span className="ds-select__check" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 8.5L6.5 11.5L12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
