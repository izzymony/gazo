/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useId, useState } from "react";
import { cn } from "@vibaar/utils";
import IconButton from "./IconButton";
import { BiChevronDown, CiSearch, MdVisibility, MdVisibilityOff, Package } from "../icons";
import PasswordCriteria from "./PasswordCriteria";
//
interface Option {
  label: string | number;
  value: string | number;
}

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "value"
  | "onChange"
  | "onBlur"
  | "placeholder"
  | "name"
  | "className"
  | "ref"
>;

/**
 * Leading adornment inside the field (₦, %, Kg, product icon). Extracted
 * because the same absolutely-positioned span appeared four times; the
 * `top-[63%]` is the field's own geometry and now exists once.
 */
function Adornment({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-4 top-[63%] -translate-y-1/2 transform pointer-events-none text-body font-medium text-foreground-primary">
      {children}
    </span>
  );
}

export interface InputFieldProps extends NativeInputProps {
  type:
    | "text"
    | "password"
    | "dropdown"
    | "textarea"
    | "number"
    | "date"
    | "email"
    | "tel"
    | "drop"; // Explicit options for type
  placeholder: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  value: string | number | undefined;
  name: string;
  showNairaSymbol?: boolean;
  showPercentage?: boolean;
  showWeightSymbol?: boolean;
  showProductIcon?: boolean;
  showSearch?: boolean;
  onEnterPress?: () => void; // New prop for Enter key handling
  error?: string;
  isReadonly?: boolean;
  disabled?: boolean;
  /** Classes for the field container. */
  className?: string;
  /** Classes for the native input itself. */
  inputClassName?: string;
  options?: Option[];
  flag?: string;
  modal?: (val: boolean) => void;
  icon?: boolean;
  mode?: "signin" | "signup";
  drops?: boolean;
  dropAction?: () => void;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  {
    type,
    placeholder,
    onChange,
    onBlur,
    value,
    name,
    showNairaSymbol = false,
    showWeightSymbol = false,
    error,
    isReadonly,
    disabled,
    className,
    inputClassName,
    showPercentage,
    showProductIcon,
    showSearch,
    options = [],
    flag,
    modal = () => {},
    icon,
    mode = "signup",
    drops = false,
    dropAction = () => {},
    onEnterPress,
    inputMode,
    id,
    required = true,
    readOnly,
    autoFocus,
    onKeyDown,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...inputProps
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId.replace(/:/g, "")}`;
  const errorId = `${inputId}-error`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropOpen, setIsDropOpen] = useState(false);
  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleDrop = () => {
    setIsDropOpen(!isDropOpen);
    modal(!isDropOpen);
  };

  // Handle Enter key press for form submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && onEnterPress) {
      e.preventDefault(); // Prevent default form submission
      onEnterPress();
    }
  };


  return (
    <>
      <div
        onClick={drops ? dropAction : undefined}
        className={cn(
          "peer relative z-10 flex h-[52px] w-full flex-col rounded-field border border-outline-strong px-3 focus-within:ring-1",
          error
            ? "border-error-border focus-within:ring-error-foreground"
            : "focus-within:ring-brandDeep",
          disabled && "cursor-not-allowed bg-ink-3 opacity-60",
          className
        )}>
        {/* Input Field */}
        {!drops && (
          <input
            {...inputProps}
            ref={ref}
            id={inputId}
            type={
              type === "password" && isPasswordVisible
                ? "text"
                : type === "dropdown" || type === "textarea" || type === "drop"
                  ? "text"
                  : type
            }
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            readOnly={readOnly ?? isReadonly ?? !onChange}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={
              [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined
            }
            inputMode={
              inputMode ||
              (type === "email" ? "email" :
               type === "tel" ? "tel" :
               type === "number" ? "numeric" :
               showSearch ? "search" : "text")
            }
            className={cn(
              "peer relative z-10 mt-[22px] bg-transparent text-body font-medium text-foreground-primary focus:outline-none focus:ring-0",
              showNairaSymbol || showPercentage || showProductIcon || showSearch
                ? "pl-6"
                : showWeightSymbol
                  ? "pl-5"
                  : undefined,
              inputClassName
            )}
            placeholder=" "
            autoFocus={
              autoFocus ??
              (showNairaSymbol || showPercentage || showWeightSymbol || showProductIcon || showSearch)
            }
          />
        )}
        {drops && (
          <div
            className="peer relative z-10 mt-[22px] bg-transparent text-body font-medium text-foreground-primary focus:outline-none focus:ring-0">
            <p>{value}</p>
          </div>
        )}

        {/* Placeholder Label */}
        <label
          htmlFor={!drops ? inputId : undefined}
          className={`absolute transition-all duration-200 ease-in-out
             ${type === "textarea" && "!top-[35%]"}
                          ${type === "date" && "!top-1/2"}
            ${
              showNairaSymbol ||
              showWeightSymbol ||
              showPercentage ||
              showProductIcon ||
              showSearch ||
              value === 0
                ? "text-caption font-medium text-foreground-muted -translate-y-[18px] top-1/2 left-9"
                : value
                ? "text-caption font-medium text-foreground-muted -translate-y-[18px]"
                : "text-body text-foreground-secondary top-1/2 transform -translate-y-1/2 peer-focus:-translate-y-[18px]"
            } 
            peer-focus:text-caption top-1/2 !peer-focus:-translate-y-[20px] peer-focus:text-foreground-muted peer-focus:font-medium
                        ${error && "!text-error-foreground"}
`}>
          {placeholder}
        </label>

        {showSearch && (
          <CiSearch
            size={20}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none font-medium text-body text-foreground-primary"
          />
        )}

        {/* Leading adornment — one component, four call sites (was four
            identical absolutely-positioned spans). */}
        {showNairaSymbol && <Adornment>₦</Adornment>}
        {showWeightSymbol && <Adornment>Kg</Adornment>}
        {showPercentage && <Adornment>%</Adornment>}
        {showProductIcon && (
          <Adornment>
            <Package size={20} />
          </Adornment>
        )}

        {/* Password visibility — IconButton rather than a hand-rolled
            <button> with two 36px inline SVGs. Gains the shared focus ring. */}
        {type === "password" && (
          <IconButton
            icon={isPasswordVisible ? MdVisibilityOff : MdVisibility}
            label={isPasswordVisible ? "Hide password" : "Show password"}
            onClick={togglePasswordVisibility}
            disabled={disabled}
            variant="muted"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
          />
        )}

        {/* Dropdown */}
        {type === "dropdown" && (
          <>
            <span
              onClick={toggleDropdown}
              className="absolute z-20 right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-foreground-muted">
              <BiChevronDown size={25} />
            </span>
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 h-[100px] w-full rounded-field border border-outline bg-white shadow-card">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange?.({
                        target: { name: option.label, value: option.value },
                      } as React.ChangeEvent<HTMLInputElement>);
                      setIsDropdownOpen(false);
                    }}
                    className="cursor-pointer px-4 py-2 hover:bg-neutral-100">
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {type === "drop" && (
          <>
            {icon && (
              <span
                onClick={toggleDrop}
                className="absolute z-20 right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-foreground-muted">
                <BiChevronDown size={25} />
              </span>
            )}
            {flag && (
              <img
                className="absolute z-20 right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-foreground-muted rounded-full w-8 h-8 object-cover"
                onClick={toggleDrop}
                src={`https://flagcdn.com/w40/${flag}.png`}
                alt="USA Flag"
              />
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <small id={errorId} role="alert" className="text-error-foreground">
          {error}
        </small>
      )}

      {type === "password" && (name === "password" || name === "passwords") && mode === "signup" && (
        <PasswordCriteria password={typeof value === "string" ? value : ""} />
      )}
    </>
  );
});

export default InputField;
