"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type Option = {
  value: string;
  label: string;
  lang?: string;
  disabled?: boolean;
};
type Props = {
  label: ReactNode;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
};

export default function SelectField({
  label,
  options,
  value,
  onChange,
  name,
  disabled,
  busy,
  compact,
  icon,
  hideLabel,
  className,
  id: buttonId,
  required,
  invalid,
  describedBy,
  buttonRef,
}: Props) {
  const id = useId();
  const [internalValue, setInternalValue] = useState(options[0]?.value ?? "");
  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );
  const selected = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [portal, setPortal] = useState<{
    root: Element;
    direction: string;
  } | null>(null);
  const [active, setActive] = useState(selectedIndex);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const button = trigger.current!;
    const list = menu.current!;
    function position() {
      const rect = button.getBoundingClientRect();
      const gutter = 12;
      const width = Math.min(
        Math.max(rect.width, compact ? 184 : 220),
        window.innerWidth - gutter * 2,
      );
      const below = window.innerHeight - rect.bottom - gutter - 8;
      const above = rect.top - gutter - 8;
      const upwards =
        below < Math.min(options.length * 44 + 12, 280) && above > below;
      const height = Math.min(320, Math.max(44, upwards ? above : below));
      const rtl = getComputedStyle(button).direction === "rtl";
      Object.assign(list.style, {
        width: `${width}px`,
        maxHeight: `${height}px`,
        left: `${Math.max(gutter, Math.min(rtl ? rect.right - width : rect.left, window.innerWidth - width - gutter))}px`,
        top: `${upwards ? Math.max(gutter, rect.top - Math.min(list.scrollHeight, height) - 8) : rect.bottom + 8}px`,
      });
    }
    function outside(event: PointerEvent) {
      if (
        !button.contains(event.target as Node) &&
        !list.contains(event.target as Node)
      )
        setOpen(false);
    }
    position();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, compact, options.length]);

  useLayoutEffect(() => {
    if (open)
      menu.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function showMenu() {
    const button = trigger.current;
    if (!button) return;
    setPortal({
      root: button.closest("dialog") ?? document.body,
      direction: getComputedStyle(button).direction,
    });
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    setInternalValue(option.value);
    onChange?.(option.value);
    setOpen(false);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      showMenu();
      const direction = event.key === "End" || event.key === "ArrowUp" ? -1 : 1;
      let next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? last
            : !open
              ? selectedIndex
              : active + direction;
      while (next >= 0 && next <= last && options[next].disabled)
        next += direction;
      if (next >= 0 && next <= last) setActive(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else {
        setActive(selectedIndex);
        showMenu();
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      search.current = {
        text:
          (now - search.current.time < 700 ? search.current.text : "") +
          event.key,
        time: now,
      };
      const normalize = (text: string) =>
        text
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLocaleLowerCase();
      const found = options.findIndex(
        (option) =>
          !option.disabled &&
          normalize(option.label).startsWith(normalize(search.current.text)),
      );
      if (found >= 0) {
        setActive(found);
        showMenu();
      }
    }
  }

  return (
    <div
      className={`kc-select-field${compact ? " kc-select-compact" : ""}${className ? ` ${className}` : ""}`}
    >
      <span
        id={`${id}-label`}
        className={compact || hideLabel ? "sr-only" : "kc-select-label"}
      >
        {label}
      </span>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue}
          disabled={disabled}
        />
      )}
      <button
        ref={(element) => {
          trigger.current = element;
          if (buttonRef) buttonRef.current = element;
        }}
        id={buttonId}
        type="button"
        role="combobox"
        data-value={selectedValue}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-busy={busy}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        className="kc-select-trigger"
        onKeyDown={keyDown}
        onBlur={() => setOpen(false)}
        onClick={() => {
          setActive(selectedIndex);
          if (open) setOpen(false);
          else showMenu();
        }}
      >
        {icon}
        <span id={`${id}-value`} lang={selected?.lang}>
          {selected?.label}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open &&
        portal &&
        createPortal(
          <div
            ref={menu}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            dir={portal.direction}
            className="kc-select-menu"
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === selectedValue}
                aria-disabled={option.disabled || undefined}
                data-value={option.value}
                data-index={index}
                data-active={active === index}
                className="kc-select-option"
                lang={option.lang}
                onPointerMove={() => {
                  if (!option.disabled) setActive(index);
                }}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === selectedValue && (
                  <Check size={16} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>,
          portal.root,
        )}
    </div>
  );
}
