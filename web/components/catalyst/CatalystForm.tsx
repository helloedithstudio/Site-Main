"use client";

// The six-field Catalyst registration form.
// Uses the useCatalystForm hook for all state/validation; this component is pure UI.

import { useId, useRef, useEffect, type FormEvent } from "react";
import { brand } from "@/lib/brand";
import { useCatalystForm, type FormFields } from "./useCatalystForm";

// ---------------------------------------------------------------------------
// Inline SVG icons — brand icons not in lucide; keeping zero new deps.
// ---------------------------------------------------------------------------

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.37 3c-.23.41-.5.97-.68 1.41a18.4 18.4 0 0 0-5.37 0A13.3 13.3 0 0 0 8.63 3 19.9 19.9 0 0 0 3.68 4.38C.53 9.19-.32 13.88.1 18.5a20 20 0 0 0 5.99 3c.49-.65.92-1.34 1.3-2.07a12.9 12.9 0 0 1-2.04-.97l.5-.38a14.3 14.3 0 0 0 12.3 0l.5.38c-.65.37-1.33.7-2.04.97.37.73.8 1.42 1.3 2.07A19.9 19.9 0 0 0 23.9 18.5c.49-5.26-.84-9.9-3.58-14.13ZM8.02 15.6c-1.17 0-2.12-1.05-2.12-2.35S6.82 10.9 8 10.9s2.14 1.06 2.12 2.35c0 1.3-.93 2.35-2.1 2.35Zm7.96 0c-1.17 0-2.12-1.05-2.12-2.35s.93-2.35 2.12-2.35 2.13 1.06 2.12 2.35c0 1.3-.93 2.35-2.12 2.35Z" />
    </svg>
  );
}

function IconGitHub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.7.11 2.5.33 1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10Z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.902-5.635Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="ctf-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
};

function Field({ id, label, hint, icon, error, children }: FieldProps) {
  const errId = `${id}-err`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="ctf-field">
      <label className="ctf-label" htmlFor={id}>
        <span className="ctf-label__icon">{icon}</span>
        {label}
      </label>
      {hint ? (
        <p className="ctf-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {/* Pass error/hint IDs down via data attributes; children read them */}
      <div
        className="ctf-input-wrap"
        data-error-id={error ? errId : undefined}
        data-hint-id={hintId}
      >
        {children}
      </div>
      {error ? (
        <p className="ctf-error" id={errId} role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

function SuccessScreen({ onClose }: { onClose: () => void }) {
  const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "";
  return (
    <div className="ctf-success" role="status">
      <div className="ctf-success__icon" aria-hidden="true">🎉</div>
      <h3 className="ctf-success__title">You're a Catalyst</h3>
      <p className="ctf-success__text">
        Head back to the Discord — your access will be updated shortly.
      </p>
      <div className="ctf-success__actions">
        {discordInvite ? (
          <a
            href={discordInvite}
            className="ctf-btn ctf-btn--primary"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            Back to Discord
          </a>
        ) : null}
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form component
// ---------------------------------------------------------------------------

type Props = {
  onClose: () => void;
  /** Passed from the modal so the first field can be focused on open. */
  firstFieldRef?: React.RefObject<HTMLInputElement | null>;
};

export default function CatalystForm({ onClose, firstFieldRef }: Props) {
  const uid = useId();
  const id = (field: string) => `ctf-${uid}-${field}`;

  const { fields, errors, phase, banner, setField, touch, submit, reset, isSubmitting, isSuccess } =
    useCatalystForm();

  // Focus the first input when the form mounts (modal open).
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (firstFieldRef) {
      (firstFieldRef as React.MutableRefObject<HTMLInputElement | null>).current =
        nameRef.current;
    }
  }, [firstFieldRef]);

  const handleClose = () => {
    reset();
    onClose();
  };

  if (isSuccess) return <SuccessScreen onClose={handleClose} />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const inputProps = (field: keyof FormFields, extra?: Record<string, unknown>) => ({
    id: id(field),
    value: fields[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setField(field, e.target.value),
    onBlur: () => touch(field),
    "aria-invalid": errors[field] ? ("true" as const) : undefined,
    "aria-describedby":
      [errors[field] ? `${id(field)}-err` : null, field === "discordId" ? `${id(field)}-hint` : null]
        .filter(Boolean)
        .join(" ") || undefined,
    disabled: isSubmitting,
    ...extra,
  });

  return (
    <form
      className="ctf-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Become a Catalyst registration form"
    >
      {/* Dismissible error banner */}
      {banner ? (
        <div className="ctf-banner" role="alert" aria-live="assertive">
          <span>{banner}</span>
          <button
            type="button"
            className="ctf-banner__dismiss"
            aria-label="Dismiss error"
            onClick={() => {
              /* banner clears on next submit */
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* 1 — Full Name */}
      <Field id={id("name")} label="Full Name" icon={<IconUser />} error={errors.name}>
        <input
          {...inputProps("name")}
          ref={nameRef}
          type="text"
          className="ctf-input"
          autoComplete="name"
          maxLength={80}
          placeholder="Jane Doe"
        />
        {fields.name && !errors.name ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* 2 — Discord ID */}
      <Field
        id={id("discordId")}
        label="Discord Username"
        hint="Your Discord username, not your display name."
        icon={<IconDiscord />}
        error={errors.discordId}
      >
        <input
          {...inputProps("discordId")}
          type="text"
          className="ctf-input"
          autoComplete="off"
          maxLength={64}
          placeholder="username or username#1234"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {fields.discordId && !errors.discordId ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* 3 — GitHub ID */}
      <Field id={id("githubId")} label="GitHub Username" icon={<IconGitHub />} error={errors.githubId}>
        <input
          {...inputProps("githubId")}
          type="text"
          className="ctf-input"
          autoComplete="off"
          maxLength={120}
          placeholder="octocat or github.com/octocat"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {fields.githubId && !errors.githubId ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* 4 — X (Twitter) handle */}
      <Field id={id("xId")} label="X (Twitter) Handle" icon={<IconX />} error={errors.xId}>
        <input
          {...inputProps("xId")}
          type="text"
          className="ctf-input"
          autoComplete="off"
          maxLength={60}
          placeholder="@handle or x.com/handle"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {fields.xId && !errors.xId ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* 5 — LinkedIn */}
      <Field id={id("linkedinId")} label="LinkedIn Profile" icon={<IconLinkedIn />} error={errors.linkedinId}>
        <input
          {...inputProps("linkedinId")}
          type="text"
          className="ctf-input"
          autoComplete="off"
          maxLength={200}
          placeholder="jane-doe or linkedin.com/in/jane-doe"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {fields.linkedinId && !errors.linkedinId ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* 6 — Portfolio URL */}
      <Field id={id("portfolioUrl")} label="Portfolio / Website" icon={<IconGlobe />} error={errors.portfolioUrl}>
        <input
          {...inputProps("portfolioUrl")}
          type="url"
          className="ctf-input"
          autoComplete="url"
          maxLength={200}
          placeholder="https://example.com"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
        />
        {fields.portfolioUrl && !errors.portfolioUrl ? (
          <span className="ctf-input-ok" aria-hidden="true">
            <IconCheck />
          </span>
        ) : null}
      </Field>

      {/* Honeypot — visually hidden, never filled by real users */}
      <div className="ctf-trap" aria-hidden="true">
        <label htmlFor={id("hp")}>Website</label>
        <input
          id={id("hp")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={fields.hp}
          onChange={(e) => setField("hp", e.target.value)}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="ctf-btn ctf-btn--primary ctf-btn--submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner />
            Sending…
          </>
        ) : (
          "Become a Catalyst"
        )}
      </button>
    </form>
  );
}
