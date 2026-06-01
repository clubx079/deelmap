'use client'
import { useEffect, useRef } from 'react'

/**
 * Brand-aligned confirmation dialog. Use for destructive or binding actions.
 * Props:
 *   open: boolean
 *   onClose: () => void   (called on backdrop click, ESC, Cancel)
 *   onConfirm: () => void
 *   title: string
 *   message?: string | ReactNode
 *   confirmText?: string  (default "Confirm")
 *   cancelText?: string   (default "Cancel")
 *   danger?: boolean      (red confirm button — for destructive actions)
 *   busy?: boolean        (locks the buttons while async work runs)
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  busy = false,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-[#1A1816]/50"
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[420px] bg-white rounded shadow-lg border border-[#E8E8E4] p-6">
        <h3 className="text-[16px] font-semibold text-[#1A1816] mb-2">{title}</h3>
        {message && (
          <div className="text-[13px] text-[#444441] leading-relaxed mb-5">{message}</div>
        )}
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-[13px] font-medium text-[#444441] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              'px-4 py-2 text-[13px] font-semibold text-white rounded transition-colors disabled:opacity-50 ' +
              (danger
                ? 'bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022]'
                : 'bg-[#1A1816] hover:bg-[#000]')
            }
          >
            {busy ? 'Please wait…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
