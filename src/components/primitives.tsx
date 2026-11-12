"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Origin home">
      <span className="brand-mark" aria-hidden="true">o</span>
      {!compact && <span>origin<span className="brand-period">.</span></span>}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button className={`button button-${variant}`} {...props}>{children}</button>;
}

export function Field({
  label,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} aria-invalid={Boolean(error)} />
      {hint && <small>{hint}</small>}
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span><select {...props}>{children}</select></label>;
}

export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  return <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading" role="status"><span className="spinner" />{label}…</div>;
}

export function Dialog({
  title,
  description,
  confirmLabel = "Continue",
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useModalFocus(onCancel);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" tabIndex={-1}>
        <button className="dialog-close" onClick={onCancel} aria-label="Close dialog">×</button>
        <p className="eyebrow">Please confirm</p>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description">{description}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

export function useModalFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    const activeDialog: HTMLElement = element;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(activeDialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ));
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    activeDialog.addEventListener("keydown", handleKeyDown);
    return () => {
      activeDialog.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);
  return dialogRef;
}

export function useConfirmation() {
  const [pending, setPending] = useState<null | { title: string; description: string; label: string; danger: boolean; action: () => void }>(null);
  const confirm = (input: { title: string; description: string; label?: string; danger?: boolean; action: () => void }) =>
    setPending({ title: input.title, description: input.description, label: input.label || "Continue", danger: Boolean(input.danger), action: input.action });
  const dialog = pending ? (
    <Dialog
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.label}
      danger={pending.danger}
      onCancel={() => setPending(null)}
      onConfirm={() => { const action = pending.action; setPending(null); action(); }}
    />
  ) : null;
  return { confirm, dialog };
}

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <div className="page-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">○</span><h2>{title}</h2><p>{children}</p></div>;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
