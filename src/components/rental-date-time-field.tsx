"use client";
import Dropdown from "./dropdown";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import {
  addCalendarDays,
  calendarDays,
  dateAtNoon,
  isCalendarDate,
  moroccoToday,
  moroccoNow,
  shiftCalendarMonth,
} from "@/lib/rental-calendar";

type Props = {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  rangeStart?: string;
};

export default function RentalDateTimeField({
  label,
  name,
  value,
  onChange,
  min,
  max,
  rangeStart,
}: Props) {
  const t = useTranslations(),
    id = useId(),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const date = isCalendarDate(value.slice(0, 10))
    ? new Intl.DateTimeFormat(t.tag, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(dateAtNoon(value))
    : t("Select a date");
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() =>
      trigger.current?.focus({ preventScroll: true }),
    );
  };
  return (
    <div className="kc-date-field">
      <span id={`${id}-label`} className="kc-date-label">
        {t(label)}
      </span>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={trigger}
        type="button"
        className="kc-date-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-dialog` : undefined}
        onClick={() => setOpen(true)}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span id={`${id}-value`}>
          <span>{date}</span>
          <span className="kc-date-time" dir="ltr">
            {value.slice(11, 16) || "10:00"}
          </span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <CalendarDialog
          id={`${id}-dialog`}
          label={label}
          value={value}
          min={min}
          max={max}
          rangeStart={rangeStart}
          anchor={trigger}
          onClose={close}
          onApply={(next) => {
            onChange(next);
            close();
          }}
        />
      )}
    </div>
  );
}

function CalendarDialog({
  id,
  label,
  value,
  min,
  max,
  rangeStart,
  anchor,
  onClose,
  onApply,
}: Omit<Props, "name" | "onChange"> & {
  id: string;
  anchor: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onApply: (value: string) => void;
}) {
  const t = useTranslations(),
    dialog = useRef<HTMLDialogElement>(null),
    calendar = useRef<HTMLTableElement>(null);
  const today = moroccoToday();
  const effectiveMin = min && min > moroccoNow() ? min : moroccoNow();
  const rawDay = isCalendarDate(value.slice(0, 10))
    ? value.slice(0, 10)
    : effectiveMin.slice(0, 10);
  const initialDay =
    rawDay < effectiveMin.slice(0, 10)
      ? effectiveMin.slice(0, 10)
      : max && rawDay > max.slice(0, 10)
        ? max.slice(0, 10)
        : rawDay;
  const [selected, setSelected] = useState(initialDay),
    [focused, setFocused] = useState(initialDay),
    [month, setMonth] = useState(initialDay.slice(0, 7));
  const [time, setTime] = useState(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.slice(11, 16))
      ? value.slice(11, 16)
      : "10:00",
  );
  const draft = `${selected}T${time}`;
  const valid = draft >= effectiveMin && (!max || draft <= max);
  const unavailable = (day: string) =>
    day < effectiveMin.slice(0, 10) || Boolean(max && day > max.slice(0, 10));
  const longDate = (day: string) =>
    new Intl.DateTimeFormat(t.tag, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(dateAtNoon(day));
  const monthTitle = new Intl.DateTimeFormat(t.tag, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateAtNoon(`${month}-01`));
  const days = calendarDays(month),
    weekdays = Array.from({ length: 7 }, (_, i) =>
      addCalendarDays("2026-11-02", i),
    );
  const previousMonth = shiftCalendarMonth(`${month}-01`, -1),
    nextMonth = shiftCalendarMonth(`${month}-01`, 1);
  const previousAllowed =
    shiftCalendarMonth(`${month}-01`, 0).slice(0, 7) > effectiveMin.slice(0, 7);
  const nextAllowed = !max || nextMonth.slice(0, 7) <= max.slice(0, 7);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    const position = () => {
      if (window.innerWidth <= 600) {
        element.style.removeProperty("top");
        element.style.removeProperty("left");
        return;
      }
      const field = anchor.current?.getBoundingClientRect();
      if (!field) return;
      const rect = element.getBoundingClientRect(),
        rtl = getComputedStyle(element).direction === "rtl";
      const top =
        field.bottom + rect.height + 14 < window.innerHeight
          ? field.bottom + 8
          : Math.max(
              12,
              Math.min(
                field.top - rect.height - 8,
                window.innerHeight - rect.height - 12,
              ),
            );
      element.style.top = `${top}px`;
      element.style.left = `${Math.max(12, Math.min(rtl ? field.right - rect.width : field.left, window.innerWidth - rect.width - 12))}px`;
    };
    position();
    element
      .querySelector<HTMLButtonElement>('[data-calendar-day][tabindex="0"]')
      ?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [anchor]);
  function viewMonth(day: string) {
    setMonth(day.slice(0, 7));
    const target = shiftCalendarMonth(
      focused,
      (Number(day.slice(0, 4)) - Number(focused.slice(0, 4))) * 12 +
        Number(day.slice(5, 7)) -
        Number(focused.slice(5, 7)),
    );
    setFocused(
      target < effectiveMin.slice(0, 10)
        ? effectiveMin.slice(0, 10)
        : max && target > max.slice(0, 10)
          ? max.slice(0, 10)
          : target,
    );
  }
  function dayKeys(event: React.KeyboardEvent<HTMLButtonElement>, day: string) {
    const rtl = t.locale === "ar",
      weekday = (dateAtNoon(day).getUTCDay() + 6) % 7;
    const movement: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: 7,
      ArrowUp: -7,
      Home: -weekday,
      End: 6 - weekday,
    };
    let target: string;
    if (event.key in movement)
      target = addCalendarDays(day, movement[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown")
      target = shiftCalendarMonth(
        day,
        (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1),
      );
    else return;
    event.preventDefault();
    if (unavailable(target)) return;
    setFocused(target);
    setMonth(target.slice(0, 7));
    requestAnimationFrame(() =>
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-calendar-day="${target}"]`)
        ?.focus({ preventScroll: true }),
    );
  }
  const minuteOptions = [
    ...new Set(["00", "15", "30", "45", time.slice(3, 5)]),
  ].sort();
  return (
    <dialog
      ref={dialog}
      id={id}
      className="kc-calendar-dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="kc-calendar-content">
        <div className="kc-calendar-top">
          <div>
            <span className="kc-calendar-context">
              <CalendarDays size={15} aria-hidden="true" />
              {t("Choose a date and time")}
            </span>
            <h2 id={`${id}-title`}>{t(label)}</h2>
          </div>
          <button
            type="button"
            className="kc-calendar-icon"
            onClick={onClose}
            aria-label={t("Close calendar")}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="kc-calendar-month">
          <h3 id={`${id}-month`} aria-live="polite">
            {monthTitle}
          </h3>
          <div>
            <button
              type="button"
              className="kc-calendar-icon"
              disabled={!previousAllowed}
              onClick={() => viewMonth(previousMonth)}
              aria-label={t("Previous month")}
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="kc-calendar-icon"
              disabled={!nextAllowed}
              onClick={() => viewMonth(nextMonth)}
              aria-label={t("Next month")}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <table
          ref={calendar}
          className="kc-calendar-grid"
          role="grid"
          aria-labelledby={`${id}-month`}
        >
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th key={day} scope="col">
                  <abbr
                    title={new Intl.DateTimeFormat(t.tag, {
                      weekday: "long",
                      timeZone: "UTC",
                    }).format(dateAtNoon(day))}
                  >
                    {new Intl.DateTimeFormat(t.tag, {
                      weekday: t.locale === "ar" ? "narrow" : "short",
                      timeZone: "UTC",
                    }).format(dateAtNoon(day))}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, week) => (
              <tr key={week}>
                {days.slice(week * 7, week * 7 + 7).map((day) => {
                  const selectedDay = day === selected,
                    rangeBeginning = rangeStart?.slice(0, 10) === day,
                    inRange = Boolean(
                      rangeStart &&
                      day > rangeStart.slice(0, 10) &&
                      day < selected,
                    );
                  return (
                    <td
                      key={day}
                      role="gridcell"
                      aria-selected={selectedDay}
                      className={`${inRange ? "in-range" : ""} ${rangeBeginning ? "range-beginning" : ""}`}
                    >
                      <button
                        type="button"
                        data-calendar-day={day}
                        tabIndex={day === focused ? 0 : -1}
                        disabled={unavailable(day)}
                        aria-label={longDate(day)}
                        aria-current={day === today ? "date" : undefined}
                        className={`${selectedDay ? "selected" : ""} ${day.slice(0, 7) !== month ? "outside-month" : ""} ${rangeBeginning ? "range-start" : ""}`}
                        onKeyDown={(event) => dayKeys(event, day)}
                        onClick={() => {
                          setSelected(day);
                          setFocused(day);
                          if (day.slice(0, 7) !== month)
                            setMonth(day.slice(0, 7));
                        }}
                      >
                        {new Intl.DateTimeFormat(t.tag, {
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(dateAtNoon(day))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="kc-calendar-time">
          <label htmlFor={`${id}-hour`}>
            <Clock3 size={15} aria-hidden="true" />
            {t("Pickup / return time")}
            <span>{t("Morocco local time · 24-hour clock")}</span>
          </label>
          <div className="kc-calendar-time-inputs" dir="ltr">
            <Dropdown
              label={t("Hour")}
              hideLabel
              id={`${id}-hour`}
              aria-label={t("Hour")}
              value={time.slice(0, 2)}
              onChange={(event) =>
                setTime(`${event.target.value}:${time.slice(3, 5)}`)
              }
            >
              {Array.from({ length: 24 }, (_, hour) =>
                String(hour).padStart(2, "0"),
              ).map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </Dropdown>
            <span aria-hidden="true">:</span>
            <Dropdown
              label={t("Minutes")}
              hideLabel
              aria-label={t("Minutes")}
              value={time.slice(3, 5)}
              onChange={(event) =>
                setTime(`${time.slice(0, 2)}:${event.target.value}`)
              }
            >
              {minuteOptions.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </Dropdown>
          </div>
        </div>
        {!valid && (
          <p role="status" className="kc-calendar-error">
            {t(
              draft < effectiveMin
                ? "Choose {0} or later."
                : "Choose {0} or earlier.",
              {
                "0": new Intl.DateTimeFormat(t.tag, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                  timeZone: "UTC",
                }).format(
                  new Date(`${draft < effectiveMin ? effectiveMin : max}:00Z`),
                ),
              },
            )}
          </p>
        )}
        <div className="kc-calendar-footer">
          <button
            type="button"
            className="kc-calendar-today"
            disabled={unavailable(today)}
            onClick={() => {
              setSelected(today);
              setFocused(today);
              setMonth(today.slice(0, 7));
            }}
          >
            {t("Today")}
          </button>
          <button
            type="button"
            className="kc-calendar-apply"
            disabled={!valid}
            onClick={() => onApply(draft)}
          >
            {t("Apply date")}
            <Check size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
