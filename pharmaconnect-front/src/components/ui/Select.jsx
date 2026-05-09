import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Select = forwardRef(({ 
  className, 
  options, 
  label, 
  helperText, 
  error, 
  fullWidth = false,
  onChange,
  id,
  ...props 
}, ref) => {
  const selectId = id || React.useId();
  
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={cn(fullWidth ? 'w-full' : '', 'mb-4')}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={cn(
          "block rounded-md border border-gray-300 shadow-sm w-full",
          "focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
          "px-3 py-2 bg-white",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "",
          className
        )}
        onChange={handleChange}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-description` : undefined}
        {...props}
      >
       {Array.isArray(options) && options.map(option => (
  <option 
    key={option.value} 
    value={option.value}
    disabled={option.disabled}
  >
    {option.label}
  </option>
))}

      </select>
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500" id={`${selectId}-description`}>
          {helperText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${selectId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;