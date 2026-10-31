"use client";
import {
  useEffect,
  useSyncExternalStore,
  type RefObject,
  type KeyboardEvent,
} from "react";

const subscribeHydration = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
}

export function handleTabKeys(event: KeyboardEvent<HTMLElement>) {
  const tabs = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not(:disabled)',
    ),
  ];
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  const direction =
    event.key === "ArrowRight"
      ? rtl
        ? -1
        : 1
      : event.key === "ArrowLeft"
        ? rtl
          ? 1
          : -1
        : 0;
  const next =
    event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs.at(-1)
        : direction
          ? tabs[(current + direction + tabs.length) % tabs.length]
          : undefined;
  if (next) {
    event.preventDefault();
    next.focus();
    next.click();
  }
}

export function useNavigationFocus(
  open: boolean,
  container: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLButtonElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const element = container.current;
    if (!element) return;
    const targets = () =>
      [
        ...element.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),summary,[tabindex="0"]',
        ),
      ].filter(
        (el) =>
          el.getClientRects().length &&
          getComputedStyle(el).visibility !== "hidden",
      );
    targets()[0]?.focus();
    function key(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const items = targets(),
          first = items[0],
          last = items.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !element!.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        }
        if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !element!.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    const media = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (media.matches) close();
    };
    document.addEventListener("keydown", key);
    media.addEventListener("change", resize);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const button = trigger.current;
    return () => {
      document.removeEventListener("keydown", key);
      media.removeEventListener("change", resize);
      document.body.style.overflow = previousOverflow;
      if (button?.isConnected) button.focus();
    };
  }, [open, container, trigger, close]);
}
