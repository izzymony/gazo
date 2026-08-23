/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { BiChevronDown, CiSearch } from "@/design-system/icons";
import PasswordCriteria from "./PasswordCriteria";
//
interface Option {
  label: string | number;
  value: string | number;
}

export interface InputFieldProps {
  type:
    | "text"
    | "password"
    | "dropdown"
    | "textarea"
    | "number"
    | "dropdown"
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
  onKeyPress?: unknown;
  onEnterPress?: () => void; // New prop for Enter key handling
  error?: string;
  isReadonly?: boolean;
  disabled?: boolean;
  className?: string;
  options?: Option[];
  ref?: any;
  flag?: string;
  modal?: (val: boolean) => void;
  icon?: boolean;
  mode?: "signin" | "signup";
  drops?: boolean;
  dropAction?: () => void;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "search"; // Better mobile keyboard
}

export default function InputField({
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
  showPercentage,
  showProductIcon,
  showSearch,
  options = [], // Empty array by default
  ref,
  flag,
  modal = () => {},
  icon,
  mode = "signup",
  drops = false,
  dropAction = () => {},
  onEnterPress,
  inputMode,
}: InputFieldProps) {
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
    if (e.key === 'Enter' && onEnterPress) {
      e.preventDefault(); // Prevent default form submission
      onEnterPress();
    }
  };


  return (
    <>
      <div
        onClick={drops ? dropAction : () => {}}
        className={`peer flex flex-col relative w-full px-3 h-[52px] z-10 rounded-field border border-ink-20 focus-within:ring-1 ${
          error
            ? "border-red focus-within:ring-red"
            : "focus-within:ring-black"
        } ${className}`}>
        {/* Input Field */}
        {!drops && (
          <input
            ref={ref ?? null}
            type={type === "password" && isPasswordVisible ? "text" : type}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            readOnly={isReadonly}
            disabled={disabled}
            inputMode={
              inputMode ||
              (type === "email" ? "email" :
               type === "tel" ? "tel" :
               type === "number" ? "numeric" :
               showSearch ? "search" : "text")
            }
            required
            className={`mt-[22px] peer -z-1 focus:ring-0 focus:outline-none z-[99] leading-[18px] text-[#000000] relative text-body bg-transparent font-medium`}
            placeholder=" "
            style={{
              paddingLeft:
                showNairaSymbol ||
                showPercentage ||
                showProductIcon ||
                showSearch
                  ? 24
                  : showWeightSymbol
                  ? 20
                  : undefined,
            }}
            {...((showNairaSymbol ||
              showPercentage ||
              showWeightSymbol ||
              showProductIcon ||
              showSearch) && { autoFocus: true })}
          />
        )}
        {drops && (
          <div
            className={`mt-[22px] peer -z-1 focus:ring-0 focus:outline-none z-[99] leading-[18px] text-[#000000] relative text-body bg-transparent font-medium`}>
            <p>{value}</p>
          </div>
        )}

        {/* Placeholder Label */}
        <label
          className={`absolute transition-all duration-200 ease-in-out
             ${type === "textarea" && "!top-[35%]"}
                          ${type === "date" && "!top-[50%]"}
            ${
              showNairaSymbol ||
              showWeightSymbol ||
              showPercentage ||
              showProductIcon ||
              showSearch ||
              value === 0
                ? "text-caption font-medium text-ink-20 -translate-y-[18px] top-[50%] left-9"
                : value
                ? "text-caption font-medium text-ink-20 -translate-y-[18px]"
                : "text-body text-ink-60 top-1/2 transform -translate-y-1/2 peer-focus:-translate-y-[18px]"
            } 
            peer-focus:text-caption top-[50%] !peer-focus:-translate-y-[20px] peer-focus:text-ink-20 peer-focus:font-medium
                        ${error && "!text-red"}
`}>
          {placeholder}
        </label>

        {showSearch && (
          <CiSearch
            size={20}
            className="absolute left-2 top-[50%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-medium text-body text-black"
          />
        )}

        {/* Naira and Weight Symbols */}
        {showNairaSymbol && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-medium text-body text-black">
            ₦
          </span>
        )}
        {showWeightSymbol && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-medium text-body text-black">
            Kg
          </span>
        )}
        {showPercentage && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-medium text-body text-black">
            %
          </span>
        )}
        {showProductIcon && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-semibold text-body text-black">
            <svg
              width="20"
              height="21"
              viewBox="0 0 20 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <mask
                id="mask0_6113_10579"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="20"
                height="21">
                <rect y="0.5" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_6113_10579)">
                <path
                  d="M17.0833 6.55941L9.99997 10.4946M9.99997 10.4946L2.91664 6.55941M9.99997 10.4946L10 18.4113M17.5 13.8767V7.11249C17.5 6.82695 17.5 6.68419 17.4579 6.55685C17.4207 6.44421 17.3599 6.3408 17.2795 6.25356C17.1886 6.15495 17.0638 6.08561 16.8142 5.94695L10.6475 2.52102C10.4112 2.38972 10.293 2.32407 10.1679 2.29833C10.0571 2.27556 9.94288 2.27556 9.83213 2.29833C9.70698 2.32407 9.58881 2.38972 9.35248 2.52102L3.18581 5.94695C2.93621 6.08562 2.8114 6.15495 2.72053 6.25356C2.64013 6.34081 2.57929 6.44421 2.54207 6.55685C2.5 6.68419 2.5 6.82695 2.5 7.11249V13.8767C2.5 14.1623 2.5 14.3051 2.54207 14.4324C2.57929 14.545 2.64013 14.6484 2.72053 14.7357C2.8114 14.8343 2.93621 14.9036 3.18581 15.0423L9.35248 18.4682C9.58881 18.5995 9.70698 18.6652 9.83213 18.6909C9.94288 18.7137 10.0571 18.7137 10.1679 18.6909C10.293 18.6652 10.4112 18.5995 10.6475 18.4682L16.8142 15.0423C17.0638 14.9036 17.1886 14.8343 17.2795 14.7357C17.3599 14.6484 17.4207 14.545 17.4579 14.4324C17.5 14.3051 17.5 14.1623 17.5 13.8767Z"
                  stroke="white"
                  strokeLinecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M17.0833 6.55941L9.99997 10.4946M9.99997 10.4946L2.91664 6.55941M9.99997 10.4946L10 18.4113M17.5 13.8767V7.11249C17.5 6.82695 17.5 6.68419 17.4579 6.55685C17.4207 6.44421 17.3599 6.3408 17.2795 6.25356C17.1886 6.15495 17.0638 6.08561 16.8142 5.94695L10.6475 2.52102C10.4112 2.38972 10.293 2.32407 10.1679 2.29833C10.0571 2.27556 9.94288 2.27556 9.83213 2.29833C9.70698 2.32407 9.58881 2.38972 9.35248 2.52102L3.18581 5.94695C2.93621 6.08562 2.8114 6.15495 2.72053 6.25356C2.64013 6.34081 2.57929 6.44421 2.54207 6.55685C2.5 6.68419 2.5 6.82695 2.5 7.11249V13.8767C2.5 14.1623 2.5 14.3051 2.54207 14.4324C2.57929 14.545 2.64013 14.6484 2.72053 14.7357C2.8114 14.8343 2.93621 14.9036 3.18581 15.0423L9.35248 18.4682C9.58881 18.5995 9.70698 18.6652 9.83213 18.6909C9.94288 18.7137 10.0571 18.7137 10.1679 18.6909C10.293 18.6652 10.4112 18.5995 10.6475 18.4682L16.8142 15.0423C17.0638 14.9036 17.1886 14.8343 17.2795 14.7357C17.3599 14.6484 17.4207 14.545 17.4579 14.4324C17.5 14.3051 17.5 14.1623 17.5 13.8767Z"
                  stroke="black"
                  stroke-opacity="0.6"
                  strokeLinecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </span>
        )}

        {/* Password Visibility Toggle */}
        {type === "password" && (
          <span
            onClick={togglePasswordVisibility}
            className="absolute right-4 top-[50%] z-[999] transform -translate-y-1/2 cursor-pointer text-ink-40">
            {!isPasswordVisible ? (
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20.5003 18.0013C20.5003 19.382 19.381 20.5013 18.0003 20.5013C16.6196 20.5013 15.5003 19.382 15.5003 18.0013C15.5003 16.6206 16.6196 15.5013 18.0003 15.5013C19.381 15.5013 20.5003 16.6206 20.5003 18.0013Z"
                  stroke="white"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M20.5003 18.0013C20.5003 19.382 19.381 20.5013 18.0003 20.5013C16.6196 20.5013 15.5003 19.382 15.5003 18.0013C15.5003 16.6206 16.6196 15.5013 18.0003 15.5013C19.381 15.5013 20.5003 16.6206 20.5003 18.0013Z"
                  stroke="black"
                  stroke-opacity="0.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.0488 18.0013C11.1107 14.6204 14.2693 12.168 18.0007 12.168C21.732 12.168 24.8906 14.6204 25.9525 18.0013C24.8906 21.3822 21.732 23.8346 18.0007 23.8346C14.2693 23.8346 11.1107 21.3822 10.0488 18.0013Z"
                  stroke="white"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.0488 18.0013C11.1107 14.6204 14.2693 12.168 18.0007 12.168C21.732 12.168 24.8906 14.6204 25.9525 18.0013C24.8906 21.3822 21.732 23.8346 18.0007 23.8346C14.2693 23.8346 11.1107 21.3822 10.0488 18.0013Z"
                  stroke="black"
                  stroke-opacity="0.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.5003 10.5L13.4913 13.491M25.5003 25.5L22.5096 22.5093M19.5627 23.6872C19.0567 23.7831 18.5346 23.8333 18.0007 23.8333C14.2693 23.8333 11.1107 21.3809 10.0488 18C10.3379 17.0796 10.7824 16.228 11.3515 15.476M16.2325 16.2322C16.6849 15.7798 17.3099 15.5 18.0003 15.5C19.381 15.5 20.5003 16.6193 20.5003 18C20.5003 18.6904 20.2205 19.3154 19.7681 19.7678M16.2325 16.2322L19.7681 19.7678M16.2325 16.2322L13.4913 13.491M19.7681 19.7678L13.4913 13.491M19.7681 19.7678L22.5096 22.5093M13.4913 13.491C14.7911 12.653 16.3391 12.1667 18.0007 12.1667C21.732 12.1667 24.8906 14.6191 25.9525 18C25.3634 19.8756 24.1291 21.4654 22.5096 22.5093"
                  stroke="white"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.5003 10.5L13.4913 13.491M25.5003 25.5L22.5096 22.5093M19.5627 23.6872C19.0567 23.7831 18.5346 23.8333 18.0007 23.8333C14.2693 23.8333 11.1107 21.3809 10.0488 18C10.3379 17.0796 10.7824 16.228 11.3515 15.476M16.2325 16.2322C16.6849 15.7798 17.3099 15.5 18.0003 15.5C19.381 15.5 20.5003 16.6193 20.5003 18C20.5003 18.6904 20.2205 19.3154 19.7681 19.7678M16.2325 16.2322L19.7681 19.7678M16.2325 16.2322L13.4913 13.491M19.7681 19.7678L13.4913 13.491M19.7681 19.7678L22.5096 22.5093M13.4913 13.491C14.7911 12.653 16.3391 12.1667 18.0007 12.1667C21.732 12.1667 24.8906 14.6191 25.9525 18C25.3634 19.8756 24.1291 21.4654 22.5096 22.5093"
                  stroke="black"
                  stroke-opacity="0.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            )}{" "}
            {/* Replace with eye icons */}
          </span>
        )}

        {/* Dropdown */}
        {type === "dropdown" && (
          <>
            <span
              onClick={toggleDropdown}
              className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-ink-40">
              <BiChevronDown size={25} />
            </span>
            {isDropdownOpen && (
              <div className="absolute z-[999] top-full h-[100px] left-0 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange?.({
                        target: { name: option.label, value: option.value },
                      } as React.ChangeEvent<HTMLInputElement>);
                      setIsDropdownOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
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
                className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-ink-40">
                <BiChevronDown size={25} />
              </span>
            )}
            {flag && (
              <img
                className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-ink-40 rounded-full w-8 h-8 object-cover"
                onClick={toggleDrop}
                src={`https://flagcdn.com/w40/${flag}.png`}
                alt="USA Flag"
              />
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && <small className="text-red">{error}</small>}

      {type === "password" && (name === "password" || name === "passwords") && mode === "signup" && (
        <PasswordCriteria password={typeof value === "string" ? value : ""} />
      )}
    </>
  );
}
