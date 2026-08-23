/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Option {
  label: string | number;
  value: string | number;
}

interface InputFieldProps {
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
    | "drop";
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string | number | undefined;
  name: string;
  showNairaSymbol?: boolean;
  showPercentage?: boolean;
  showWeightSymbol?: boolean;
  showProductIcon?: boolean;
  showSearch?: boolean;
  onKeyPress?: unknown;
  error?: string;
  isReadonly?: boolean;
  className?: string;
  options?: Option[];
  ref?: any;
  flag?: string;
  modal?: (val: boolean) => void;
  icon?: boolean;
  mode?: "signin" | "signup";
  drops?: boolean;
  dropAction?: () => void;
}

export default function InputField({
  type,
  placeholder,
  onChange,
  value,
  name,
  showNairaSymbol = false,
  showWeightSymbol = false,
  error,
  isReadonly,
  className,
  showPercentage,
  showProductIcon,
  showSearch,
  options = [],
  ref,
  flag,
  modal = () => {},
  icon,
  mode = "signup",
  drops = false,
  dropAction = () => {},
}: InputFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropOpen, setIsDropOpen] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasUppercase: false,
  });

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleDrop = () => {
    setIsDropOpen(!isDropOpen);
    modal(!isDropOpen);
  };

  useEffect(() => {
    if (type === "password") {
      setPasswordCriteria({
        minLength: typeof value === "string" ? value.length >= 8 : false,
        hasNumber: typeof value === "string" ? /\d/.test(value) : false,
        hasSpecialChar:
          typeof value === "string"
            ? /[!@#$%^&*(),.?":{}|<>]/.test(value)
            : false,
        hasUppercase: typeof value === "string" ? /[A-Z]/.test(value) : false,
      });
    }
  }, [value, type]);

  return (
    <>
      <div
        onClick={drops ? dropAction : () => {}}
        className={`peer flex flex-col relative w-full px-3 h-[52px] z-10 rounded-[12px] border border-[#00000033] focus-within:ring-1 ${
          error
            ? "border-red focus-within:ring-[red]"
            : "focus-within:ring-instaRed"
        } ${className}`}>
        {/* Input Field */}
        {!drops && (
          <input
            ref={ref ?? null}
            type={type === "password" && isPasswordVisible ? "text" : type}
            name={name}
            value={value}
            onChange={onChange}
            readOnly={isReadonly}
            required
            className={`mt-[22px] peer -z-1 focus:ring-0 focus:outline-none z-[99] leading-[18px] text-[#000000] relative text-[14px] bg-transparent font-medium`}
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
              fontSize: '16px', // Prevent zoom on iOS
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
            className={`mt-[22px] peer -z-1 focus:ring-0 focus:outline-none z-[99] leading-[18px] text-[#000000] relative text-[14px] bg-transparent font-medium`}>
            <p>{value}</p>
          </div>
        )}

        {/* Floating Label */}
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
                ? "text-[10px] font-medium text-[#00000033] -translate-y-[18px] top-[50%] left-9"
                : value
                ? "text-[10px] font-medium text-[#00000033] -translate-y-[18px]"
                : "text-[14px] text-[#00000099] top-1/2 transform -translate-y-1/2 peer-focus:-translate-y-[18px]"
            } 
            peer-focus:text-[10px] top-[50%] !peer-focus:-translate-y-[20px] peer-focus:text-[#00000033] peer-focus:font-medium
                        ${error && "!text-[red]"}
`}>
          {placeholder}
        </label>

        {showSearch && (
          <Search
            size={20}
            className="absolute left-2 top-[50%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-[500] text-[14px] text-black"
          />
        )}

        {/* Symbols */}
        {showNairaSymbol && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-[500] text-[14px] text-black">
            ₦
          </span>
        )}
        {showWeightSymbol && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-[500] text-[14px] text-black">
            Kg
          </span>
        )}
        {showPercentage && (
          <span className="absolute left-4 top-[63%] transform -translate-y-1/2 pointer-events-none leading-[18px] font-[500] text-[14px] text-black">
            %
          </span>
        )}

        {/* Password Visibility Toggle */}
        {type === "password" && (
          <span
            onClick={togglePasswordVisibility}
            className="absolute right-4 top-[50%] z-[999] transform -translate-y-1/2 cursor-pointer text-[#c3c3c3]">
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.5003 18.0013C20.5003 19.382 19.381 20.5013 18.0003 20.5013C16.6196 20.5013 15.5003 19.382 15.5003 18.0013C15.5003 16.6206 16.6196 15.5013 18.0003 15.5013C19.381 15.5013 20.5003 16.6206 20.5003 18.0013Z"
                  stroke="black"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.0488 18.0013C11.1107 14.6204 14.2693 12.168 18.0007 12.168C21.732 12.168 24.8906 14.6204 25.9525 18.0013C24.8906 21.3822 21.732 23.8346 18.0007 23.8346C14.2693 23.8346 11.1107 21.3822 10.0488 18.0013Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.0488 18.0013C11.1107 14.6204 14.2693 12.168 18.0007 12.168C21.732 12.168 24.8906 14.6204 25.9525 18.0013C24.8906 21.3822 21.732 23.8346 18.0007 23.8346C14.2693 23.8346 11.1107 21.3822 10.0488 18.0013Z"
                  stroke="black"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.5003 10.5L13.4913 13.491M25.5003 25.5L22.5096 22.5093M19.5627 23.6872C19.0567 23.7831 18.5346 23.8333 18.0007 23.8333C14.2693 23.8333 11.1107 21.3809 10.0488 18C10.3379 17.0796 10.7824 16.228 11.3515 15.476M16.2325 16.2322C16.6849 15.7798 17.3099 15.5 18.0003 15.5C19.381 15.5 20.5003 16.6193 20.5003 18C20.5003 18.6904 20.2205 19.3154 19.7681 19.7678M16.2325 16.2322L19.7681 19.7678M16.2325 16.2322L13.4913 13.491M19.7681 19.7678L13.4913 13.491M19.7681 19.7678L22.5096 22.5093M13.4913 13.491C14.7911 12.653 16.3391 12.1667 18.0007 12.1667C21.732 12.1667 24.8906 14.6191 25.9525 18C25.3634 19.8756 24.1291 21.4654 22.5096 22.5093"
                  stroke="black"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}

        {/* Dropdown */}
        {type === "dropdown" && (
          <>
            <span
              onClick={toggleDropdown}
              className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-[#c3c3c3]">
              <ChevronDown size={25} />
            </span>
            {isDropdownOpen && (
              <div className="absolute z-[999] top-full h-[100px] left-0 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange({
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
                className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-[#c3c3c3]">
                <ChevronDown size={25} />
              </span>
            )}
            {flag && (
              <img
                className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-[#c3c3c3] rounded-full w-8 h-8 object-cover"
                onClick={toggleDrop}
                src={`https://flagcdn.com/w40/${flag}.png`}
                alt="Flag"
              />
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && <small className="text-instaRed">{error}</small>}

      {type === "password" && name === "password" && mode === "signup" && (
        <ul className="text-sm mt-2 ml-2 pl-10">
          <li
            className={` list-disc ${
              passwordCriteria.minLength ? "text-[#00C99F]" : "text-[#c3c3c3]"
            }`}>
            8 or more characters
          </li>
          <li
            className={` list-disc ${
              passwordCriteria.hasNumber ? "text-[#00C99F]" : "text-[#c3c3c3]"
            }`}>
            At least 1 number
          </li>
          <li
            className={`max-[] list-disc ${
              passwordCriteria.hasSpecialChar
                ? "text-[#00C99F]"
                : "text-[#c3c3c3]"
            }`}>
            At least 1 special character:
            &quot;!&quot;#$%&apos;()*+,-./:;&lt;=&gt;?@[\]^\
          </li>
          <li
            className={`list-disc ${
              passwordCriteria.hasUppercase
                ? "text-[#00C99F]"
                : "text-[#c3c3c3]"
            }`}>
            At least 1 uppercase letter
          </li>
        </ul>
      )}
    </>
  );
}