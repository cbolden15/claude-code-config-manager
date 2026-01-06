'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

interface MaskedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  isEncrypted?: boolean;
  disabled?: boolean;
}

export function MaskedInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  isEncrypted = false,
  disabled = false
}: MaskedInputProps) {
  const [showValue, setShowValue] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const isCurrentlyEncrypted = value === '[ENCRYPTED]' || isEncrypted;
  const displayValue = showValue ? inputValue : (isCurrentlyEncrypted ? '••••••••••••' : value);

  function handleInputChange(newValue: string) {
    setInputValue(newValue);
    onChange(newValue);
  }

  function toggleVisibility() {
    setShowValue(!showValue);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showValue ? 'text' : 'password'}
          value={showValue ? inputValue : displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || 'Enter value...'}
          disabled={disabled}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggleVisibility}
          disabled={disabled}
        >
          {showValue ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showValue ? 'Hide value' : 'Show value'}
          </span>
        </Button>
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {isCurrentlyEncrypted && !showValue && (
        <p className="text-xs text-amber-600">
          Currently encrypted. Enter new value to update.
        </p>
      )}
    </div>
  );
}