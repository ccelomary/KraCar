"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import SelectField from "./select-field";

type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size" | "label"
> & {
  label: ReactNode;
  hideLabel?: boolean;
};
type Option = {
  value: string;
  label: string;
  disabled?: boolean;
  lang?: string;
};

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child),
    )
    .join("");
}
function optionsOf(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        lang?: string;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup")
      return optionsOf(child.props.children, disabled || child.props.disabled);
    if (child.type !== "option") return [];
    const label = textOf(child.props.children);
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: disabled || child.props.disabled,
        lang: child.props.lang,
      },
    ];
  });
}

/** Native form submission and validation, with the shared keyboard-accessible menu. */
export default function Dropdown({
  label,
  hideLabel,
  children,
  value,
  defaultValue,
  onChange,
  onInvalid,
  onBlur,
  className,
  id,
  disabled,
  required,
  name,
  ...rest
}: Props) {
  const options = optionsOf(children);
  const initial = String(defaultValue ?? options[0]?.value ?? "");
  const [internalValue, setInternalValue] = useState(initial);
  const [validationMessage, setValidationMessage] = useState("");
  const selectedValue = String(value ?? internalValue);
  const native = useRef<HTMLSelectElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  useEffect(() => {
    const form = native.current?.form;
    function reset() {
      if (value === undefined) setInternalValue(initial);
      setValidationMessage("");
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial, value]);

  return (
    <div className="kc-dropdown">
      <select
        {...rest}
        ref={native}
        className="kc-select-native"
        tabIndex={-1}
        aria-hidden="true"
        aria-label={undefined}
        aria-labelledby={undefined}
        aria-describedby={undefined}
        name={name}
        value={selectedValue}
        disabled={disabled}
        required={required}
        onChange={(event) => {
          setInternalValue(event.target.value);
          setValidationMessage("");
          onChange?.(event);
        }}
        onBlur={onBlur}
        onInvalid={(event) => {
          event.preventDefault();
          setValidationMessage(event.currentTarget.validationMessage);
          button.current?.focus();
          onInvalid?.(event);
        }}
      >
        {children}
      </select>
      <SelectField
        label={label}
        hideLabel={hideLabel}
        className={className}
        id={id}
        value={selectedValue}
        options={options}
        disabled={disabled || options.length === 0}
        required={required}
        invalid={
          !!validationMessage ||
          rest["aria-invalid"] === true ||
          rest["aria-invalid"] === "true"
        }
        describedBy={
          [rest["aria-describedby"], validationMessage ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        buttonRef={button}
        onChange={(next) => {
          const select = native.current;
          if (!select) return;
          select.value = next;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }}
      />
      {validationMessage && (
        <span id={errorId} className="error-note" role="alert">
          {validationMessage}
        </span>
      )}
    </div>
  );
}
