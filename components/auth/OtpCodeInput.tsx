'use client';

import { useEffect, useMemo, useRef } from 'react';

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export default function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const safeValue = value.slice(0, length);
    return Array.from({ length }, (_, index) => safeValue[index] ?? '');
  }, [length, value]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const focusInput = (index: number) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const updateValueAt = (index: number, nextDigit: string) => {
    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    onChange(nextDigits.join(''));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="\d*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(event) => {
            const nextDigit = event.target.value.replace(/\D/g, '').slice(-1);
            updateValueAt(index, nextDigit);

            if (nextDigit && index < length - 1) {
              focusInput(index + 1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) {
              updateValueAt(index - 1, '');
              focusInput(index - 1);
              return;
            }

            if (event.key === 'ArrowLeft' && index > 0) {
              focusInput(index - 1);
            }

            if (event.key === 'ArrowRight' && index < length - 1) {
              focusInput(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted) {
              return;
            }

            onChange(pasted);
            const nextFocusIndex = Math.min(pasted.length, length - 1);
            focusInput(nextFocusIndex);
          }}
          className="h-12 w-11 rounded-2xl border border-gray-300 bg-white text-center text-lg font-semibold tracking-[0.2em] text-fixly-text outline-none transition focus:border-fixly-accent focus:ring-2 focus:ring-fixly-accent/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:h-14 sm:w-12"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
