"use client";

import { useSyncExternalStore } from "react";

// Roast Mode lives in the masthead menu rather than on the analyser (it's
// likely to become a paid extra), so the setting is a tiny localStorage
// store any component can read. Remembered across visits because a Trade Me
// share opens the app fresh — without that a shared listing could never be
// roasted.
const KEY = "motormind.roastMode";
const EVENT = "motormind:roastmode";

export function isRoastMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // private browsing — Roast Mode stays off
    return false;
  }
}

export function setRoastMode(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // private browsing — the toggle just won't stick
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useRoastMode(): boolean {
  return useSyncExternalStore(subscribe, isRoastMode, () => false);
}
