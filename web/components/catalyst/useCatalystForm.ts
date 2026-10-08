"use client";

// State, validation, and submission logic for the Catalyst registration form.
// Kept separate from the UI so it can be unit-tested without rendering.

import { useCallback, useReducer } from "react";
import {
  validateCatalyst,
  normaliseDiscord,
  normaliseGitHub,
  normaliseX,
  normaliseLinkedIn,
  normalisePortfolio,
  type FieldErrors,
} from "@/lib/catalyst/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFields = {
  name: string;
  discordId: string;
  githubId: string;
  xId: string;
  linkedinId: string;
  portfolioUrl: string;
  /** Honeypot — hidden from users, must stay empty. */
  hp: string;
};

export type FormPhase = "idle" | "submitting" | "success" | "error";

type State = {
  fields: FormFields;
  /** Fields that have been blurred at least once (triggers inline validation). */
  touched: Partial<Record<keyof FormFields, true>>;
  errors: FieldErrors;
  phase: FormPhase;
  /** Server-level banner message (non-field errors). */
  banner: string;
};

type Action =
  | { type: "SET_FIELD"; field: keyof FormFields; value: string }
  | { type: "TOUCH"; field: keyof FormFields }
  | { type: "TOUCH_ALL" }
  | { type: "SET_ERRORS"; errors: FieldErrors }
  | { type: "SUBMITTING" }
  | { type: "SUCCESS" }
  | { type: "SERVER_ERROR"; message: string }
  | { type: "RESET" };

const EMPTY_FIELDS: FormFields = {
  name: "",
  discordId: "",
  githubId: "",
  xId: "",
  linkedinId: "",
  portfolioUrl: "",
  hp: "",
};

const INITIAL: State = {
  fields: EMPTY_FIELDS,
  touched: {},
  errors: {},
  phase: "idle",
  banner: "",
};

// ---------------------------------------------------------------------------
// Per-field inline validation (on blur) — gives friendly, immediate feedback
// without re-running the full schema.
// ---------------------------------------------------------------------------

function validateField(field: keyof FormFields, value: string): string {
  const v = value.trim();
  switch (field) {
    case "name":
      if (!v || v.length < 2) return "Enter your full name (at least 2 characters).";
      if (v.length > 80) return "Name must be 80 characters or fewer.";
      return "";
    case "discordId":
      if (!v) return "Enter your Discord username.";
      if (!normaliseDiscord(v))
        return "That doesn't look like a valid Discord username. It should be 2-32 characters (letters, numbers, underscores or dots).";
      return "";
    case "githubId":
      if (!v) return "Enter your GitHub username.";
      if (!normaliseGitHub(v))
        return "That doesn't look like a valid GitHub username.";
      return "";
    case "xId":
      if (!v) return "Enter your X (Twitter) handle.";
      if (!normaliseX(v))
        return "That doesn't look like a valid X handle (1-15 characters, no @).";
      return "";
    case "linkedinId":
      if (!v) return "Enter your LinkedIn profile slug or URL.";
      if (!normaliseLinkedIn(v))
        return "Enter a LinkedIn slug (e.g. jane-doe) or a full linkedin.com/in/… URL.";
      return "";
    case "portfolioUrl":
      if (!v) return "Enter your portfolio or website URL.";
      if (!normalisePortfolio(v))
        return "Enter a valid website URL (http or https only).";
      return "";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FIELD": {
      const fields = { ...state.fields, [action.field]: action.value };
      // Re-validate touched fields on every keystroke so errors clear as the user types.
      const errors = { ...state.errors };
      if (state.touched[action.field]) {
        const msg = validateField(action.field, action.value);
        if (msg) errors[action.field] = msg;
        else delete errors[action.field];
      }
      return { ...state, fields, errors };
    }
    case "TOUCH": {
      const msg = validateField(action.field, state.fields[action.field]);
      const errors = { ...state.errors };
      if (msg) errors[action.field] = msg;
      else delete errors[action.field];
      return { ...state, touched: { ...state.touched, [action.field]: true }, errors };
    }
    case "TOUCH_ALL": {
      const touched: State["touched"] = {};
      const errors: FieldErrors = {};
      (Object.keys(EMPTY_FIELDS) as (keyof FormFields)[]).forEach((f) => {
        if (f === "hp") return;
        touched[f] = true;
        const msg = validateField(f, state.fields[f]);
        if (msg) errors[f] = msg;
      });
      return { ...state, touched, errors };
    }
    case "SET_ERRORS":
      return { ...state, errors: action.errors, phase: "idle" };
    case "SUBMITTING":
      return { ...state, phase: "submitting", banner: "" };
    case "SUCCESS":
      return { ...state, phase: "success", banner: "" };
    case "SERVER_ERROR":
      return { ...state, phase: "error", banner: action.message };
    case "RESET":
      return INITIAL;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCatalystForm() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const setField = useCallback(
    (field: keyof FormFields, value: string) =>
      dispatch({ type: "SET_FIELD", field, value }),
    [],
  );

  const touch = useCallback(
    (field: keyof FormFields) => dispatch({ type: "TOUCH", field }),
    [],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const submit = useCallback(async () => {
    // Touch every field to surface all errors at once.
    dispatch({ type: "TOUCH_ALL" });

    // Client-side full validation before hitting the network.
    const result = validateCatalyst(state.fields as Record<string, unknown>);
    if (!result.ok) {
      dispatch({ type: "SET_ERRORS", errors: result.errors });
      return;
    }

    dispatch({ type: "SUBMITTING" });

    try {
      const res = await fetch("/api/catalyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.fields),
      });

      type ApiResponse = {
        success: boolean;
        message: string;
        errors?: FieldErrors;
      };
      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (res.ok && json.success) {
        dispatch({ type: "SUCCESS" });
        return;
      }

      if (res.status === 422 && json.errors) {
        dispatch({ type: "SET_ERRORS", errors: json.errors });
        return;
      }

      dispatch({
        type: "SERVER_ERROR",
        message:
          json.message ||
          (res.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : res.status === 409
              ? "This Discord ID is already registered as a Catalyst."
              : "Something went wrong. Please try again."),
      });
    } catch {
      dispatch({
        type: "SERVER_ERROR",
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }, [state.fields]);

  return {
    fields: state.fields,
    errors: state.errors,
    phase: state.phase,
    banner: state.banner,
    setField,
    touch,
    submit,
    reset,
    isSubmitting: state.phase === "submitting",
    isSuccess: state.phase === "success",
  };
}
