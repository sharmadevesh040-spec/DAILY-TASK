import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface Props {
  value: string;           // 6-char string, e.g. "3" or "358" or "358214"
  onChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const LENGTH = 6;

export default function OtpInput({ value, onChange, disabled = false, hasError = false }: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Pad / slice so we always have exactly LENGTH slots
  const digits = value.padEnd(LENGTH, '').slice(0, LENGTH).split('');

  function focusAt(index: number) {
    inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');  // digits only
    if (!raw) return;

    // Take the last character typed (handles browser auto-fill of single digit)
    const char = raw[raw.length - 1];
    const arr = digits.slice();
    arr[index] = char;
    const next = arr.join('').trimEnd();
    onChange(next.padEnd(0, ''));   // don't pad — keep natural length

    // Rebuild and forward
    const newVal = arr.join('').slice(0, LENGTH);
    onChange(newVal);
    if (index < LENGTH - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[index] !== ' ' && arr[index] !== '') {
        // Clear current slot
        arr[index] = '';
        onChange(arr.join('').trimEnd());
      } else {
        // Already empty — move back and clear previous
        if (index > 0) {
          arr[index - 1] = '';
          onChange(arr.join('').trimEnd());
          focusAt(index - 1);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(index + 1);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const arr = digits.slice();
      arr[index] = '';
      onChange(arr.join('').trimEnd());
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    onChange(pasted);
    // Focus the slot after the last pasted digit
    focusAt(Math.min(pasted.length, LENGTH - 1));
  }

  function handleFocus(index: number) {
    // Select the content of the focused input so re-typing replaces it
    inputs.current[index]?.select();
  }

  const baseBox = [
    'w-11 h-12 sm:w-12 sm:h-14',
    'border-2 rounded-xl',
    'text-center text-xl sm:text-2xl font-bold',
    'transition-all duration-150',
    'outline-none',
    'select-none touch-manipulation',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    /* override the global 16px min from index.css — these are display boxes, not form inputs */
    '!text-xl',
  ].join(' ');

  const borderColor = (idx: number) => {
    if (hasError) return 'border-red-400 bg-red-50 text-red-700';
    const filled = digits[idx] && digits[idx] !== ' ';
    return filled
      ? 'border-primary-500 bg-primary-50 text-primary-700'
      : 'border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200';
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label="One-time password input"
    >
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          className={`${baseBox} ${borderColor(i)}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
        />
      ))}
    </div>
  );
}
