"use client";

// Radio group styled as tap-friendly chips (big touch targets, Spec §8).
export function ChipRadio({
  name,
  options,
  defaultValue,
  required,
  onChange,
}: {
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([value, label]) => (
        <label key={value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={value}
            defaultChecked={value === defaultValue}
            required={required}
            onChange={() => onChange?.(value)}
            className="peer sr-only"
          />
          <span className="inline-block rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 peer-checked:border-brand-green peer-checked:bg-brand-green peer-checked:text-white">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}
