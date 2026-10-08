"use client";

// Accessible modal dialog for the Catalyst registration form.
//
// Accessibility checklist:
//   ✓ <dialog> with role="dialog", aria-modal="true", aria-labelledby, aria-describedby
//   ✓ Focus trap: Tab/Shift+Tab cycle within the dialog
//   ✓ First field focused on open; trigger button focus restored on close
//   ✓ ESC key closes
//   ✓ Backdrop click closes
//   ✓ Body scroll locked while open
//   ✓ prefers-reduced-motion respected (CSS handles it)
//   ✓ Close button present and labelled

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { store } from "@/lib/runtime/store";
import { useFlag } from "@/lib/runtime/store";
import CatalystForm from "./CatalystForm";

// ---------------------------------------------------------------------------
// Focus trap utility
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function trapFocus(dialog: HTMLDialogElement, e: KeyboardEvent) {
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[aria-hidden]") && !el.closest(".ctf-trap"),
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.key !== "Tab") return;
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CatalystModal() {
  const open = useFlag("modalCatalyst");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  /** The element that had focus before the modal opened — restored on close. */
  const triggerRef = useRef<Element | null>(null);

  const close = useCallback(() => {
    store.setFlag("modalCatalyst", false);
  }, []);

  // Open / close side effects
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      triggerRef.current = document.activeElement;
      // Lock body scroll
      document.body.style.overflow = "hidden";
      dialog.showModal?.() ?? dialog.setAttribute("open", "");
      // Focus first field after the animation frame so layout is settled
      requestAnimationFrame(() => {
        (firstFieldRef.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE))?.focus();
      });
    } else {
      document.body.style.overflow = "";
      dialog.close?.() ?? dialog.removeAttribute("open");
      // Restore focus to the trigger
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    }
  }, [open]);

  // ESC is handled natively by <dialog>, but we hook it to also update our store flag.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault(); // prevent default close (we do it through state)
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [close]);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const onKeyDown = (e: KeyboardEvent) => trapFocus(dialog, e);
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Backdrop click → close
  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={`ctm-dialog${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ctm-title"
      aria-describedby="ctm-desc"
      onClick={onBackdropClick}
    >
      <div className="ctm-card" role="document">
        {/* Close button */}
        <button
          type="button"
          className="ctm-close"
          onClick={close}
          aria-label="Close form"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <header className="ctm-header">
          <p className="ctm-eyebrow">Catalyst Form</p>
          <h2 className="ctm-title" id="ctm-title">
            Become a Catalyst
          </h2>
          <p className="ctm-desc" id="ctm-desc">
            A two minute form. Complete it within 24 hours of joining the Discord.
          </p>
        </header>

        {/* Form body */}
        <div className="ctm-body">
          <CatalystForm onClose={close} firstFieldRef={firstFieldRef} />
        </div>
      </div>
    </dialog>
  );
}
