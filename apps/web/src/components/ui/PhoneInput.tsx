import { useRef } from 'react';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}

// Format phone number as (XXX) XXX-XXXX - used for display in read-only contexts
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 10);

  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

export function PhoneInput({
  label,
  value,
  onChange,
  error,
  placeholder = '(555) 123-4567',
  className = '',
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the value for display
  const displayValue = formatPhoneNumber(value);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    // Extract only digits from whatever was typed/pasted
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);

    // Calculate cursor position after formatting
    const formatted = formatPhoneNumber(digits);
    // Set the formatted value immediately
    input.value = formatted;

    // Move cursor to end
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = formatted.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }

    // Block non-digit keys
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
