/**
 * Input Component
 *
 * Accessible, customizable input primitive following design system tokens
 * Supports validation, multiple variants, sizes, and full WCAG AA compliance
 */

import React, { forwardRef, useState, useId, useCallback } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { defaultInputProps } from './types';

import type { InputProps, InputRef, ValidationResult } from './types';

// Input styling using class-variance-authority for type-safe variants
const inputVariants = cva(
  // Base input styles
  [
    // Layout & positioning
    'w-full relative',

    // Typography using design tokens
    'font-normal text-base',
    'placeholder:text-muted-foreground',

    // Transitions
    'transition-all duration-200 ease-out',

    // Disabled styles
    'disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:bg-muted',

    // Read-only styles
    'read-only:cursor-default read-only:bg-muted',
  ],
  {
    variants: {
      // Variant styles
      variant: {
        default: [
          'bg-card border border-border',
          'hover:border-muted-foreground',
          'focus:border-action',
        ],
        filled: [
          'bg-muted border border-transparent',
          'hover:bg-accent',
          'focus:bg-card focus:border-action',
        ],
        outlined: [
          'bg-transparent border-2 border-border',
          'hover:border-muted-foreground',
          'focus:border-action',
        ],
        underlined: [
          'bg-transparent border-0 border-b-2 border-border',
          'rounded-none',
          'hover:border-muted-foreground',
          'focus:border-action',
        ],
        ghost: ['bg-transparent border-0', 'hover:bg-muted', 'focus:bg-muted'],
      },

      // Size styles using design system spacing
      size: {
        xs: [
          'h-7 px-2 text-xs', // 28px height
          'rounded-sm',
        ],
        sm: [
          'h-8 px-3 text-sm', // 32px height
          'rounded-md',
        ],
        md: [
          'h-9 px-4 text-sm', // 36px height (default) - matches input-field
          'rounded-lg',
        ],
        lg: [
          'h-12 px-4 text-base', // 48px height
          'rounded-lg',
        ],
        xl: [
          'h-14 px-5 text-base', // 56px height
          'rounded-lg',
        ],
      },

      // State styles
      state: {
        default: '',
        error: ['border-danger-border focus:border-danger-border', 'focus:ring-danger-border'],
        warning: ['border-warning-border focus:border-warning-border', 'focus:ring-warning-border'],
        success: ['border-success-border focus:border-success-border', 'focus:ring-success-border'],
      },

      // Full width option
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },

      // Has left icon
      hasLeftIcon: {
        true: '',
        false: '',
      },

      // Has right icon
      hasRightIcon: {
        true: '',
        false: '',
      },
    },

    // Compound variants for icon padding adjustments
    compoundVariants: [
      // Left icon padding adjustments
      {
        hasLeftIcon: true,
        size: 'xs',
        className: 'pl-7',
      },
      {
        hasLeftIcon: true,
        size: 'sm',
        className: 'pl-8',
      },
      {
        hasLeftIcon: true,
        size: 'md',
        className: 'pl-9',
      },
      {
        hasLeftIcon: true,
        size: 'lg',
        className: 'pl-11',
      },
      {
        hasLeftIcon: true,
        size: 'xl',
        className: 'pl-12',
      },

      // Right icon padding adjustments
      {
        hasRightIcon: true,
        size: 'xs',
        className: 'pr-7',
      },
      {
        hasRightIcon: true,
        size: 'sm',
        className: 'pr-8',
      },
      {
        hasRightIcon: true,
        size: 'md',
        className: 'pr-9',
      },
      {
        hasRightIcon: true,
        size: 'lg',
        className: 'pr-11',
      },
      {
        hasRightIcon: true,
        size: 'xl',
        className: 'pr-12',
      },
    ],

    // Default variants
    defaultVariants: {
      variant: 'outlined',
      size: 'md',
      state: 'default',
      fullWidth: false,
      hasLeftIcon: false,
      hasRightIcon: false,
    },
  }
);

// Wrapper styling
const wrapperVariants = cva(['relative flex flex-col'], {
  variants: {
    fullWidth: {
      true: 'w-full',
      false: 'w-auto',
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

// Icon styling
const iconVariants = cva(['absolute top-1/2 transform -translate-y-1/2 pointer-events-none'], {
  variants: {
    position: {
      left: 'left-0',
      right: 'right-0',
    },
    size: {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-5 h-5',
    },
  },
  compoundVariants: [
    // Left icon positioning
    { position: 'left', size: 'xs', className: 'ml-2' },
    { position: 'left', size: 'sm', className: 'ml-2.5' },
    { position: 'left', size: 'md', className: 'ml-3' },
    { position: 'left', size: 'lg', className: 'ml-3.5' },
    { position: 'left', size: 'xl', className: 'ml-4' },

    // Right icon positioning
    { position: 'right', size: 'xs', className: 'mr-2' },
    { position: 'right', size: 'sm', className: 'mr-2.5' },
    { position: 'right', size: 'md', className: 'mr-3' },
    { position: 'right', size: 'lg', className: 'mr-3.5' },
    { position: 'right', size: 'xl', className: 'mr-4' },
  ],
});

// Loading spinner component for inputs
interface InputLoadingSpinnerProps {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const InputLoadingSpinner: React.FC<InputLoadingSpinnerProps> = ({ size }) => {
  return (
    <svg
      className={iconVariants({ position: 'right', size })}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75 animate-spin"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Input label component
interface InputLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  isRequired?: boolean;
  className?: string;
}

const InputLabel: React.FC<InputLabelProps> = ({
  htmlFor,
  children,
  isRequired,
  className = '',
}) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-secondary-foreground mb-1.5 ${className}`}
  >
    {children}
    {isRequired && (
      <span className="text-danger-text ml-1" aria-label="required">
        *
      </span>
    )}
  </label>
);

// Input description component
interface InputDescriptionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

const InputDescription: React.FC<InputDescriptionProps> = ({ id, children, className = '' }) => (
  <p id={id} className={`text-xs text-muted-foreground mt-1 ${className}`}>
    {children}
  </p>
);

// Input error message component
interface InputErrorProps {
  id?: string;
  children: React.ReactNode;
  type?: 'error' | 'warning' | 'success';
  className?: string;
}

const InputError: React.FC<InputErrorProps> = ({
  id,
  children,
  type = 'error',
  className = '',
}) => {
  const colors = {
    error: 'text-danger-text',
    warning: 'text-warning-text',
    success: 'text-success-text',
  };

  return (
    <p id={id} className={`text-xs ${colors[type]} mt-1 ${className}`} role="alert">
      {children}
    </p>
  );
};

// Main Input component
export const Input = forwardRef<InputRef, InputProps>(
  (
    {
      // Content props
      label,
      description,
      placeholder,

      // Styling props
      variant = defaultInputProps.variant,
      size = defaultInputProps.size,
      state = defaultInputProps.state,
      fullWidth = defaultInputProps.fullWidth,
      className,
      inputClassName,
      labelClassName,

      // Icon props
      leftIcon,
      rightIcon,
      prefix,
      suffix,

      // Validation props
      error,
      warning,
      success,
      required = defaultInputProps.required,
      validate,
      validateOn = defaultInputProps.validateOn,
      onValidationChange,

      // State props
      isLoading = defaultInputProps.isLoading,
      readOnly,
      disabled,

      // HTML props
      type = defaultInputProps.type,
      value,
      defaultValue,

      // Event handlers
      onChange,
      onValueChange,
      onBlur,
      onFocus,

      // Accessibility props
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-required': ariaRequired,

      // Other props
      ...props
    },
    ref
  ) => {
    // Generate unique IDs
    const id = useId();
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;

    // Internal validation state
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Determine current state
    const getCurrentState = useCallback(() => {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to determine input state
      if (error || validationResult?.type === 'error') return 'error';
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to determine input state
      if (warning || validationResult?.type === 'warning') return 'warning';
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to determine input state
      if (success || validationResult?.type === 'success') return 'success';
      return state;
    }, [error, warning, success, validationResult, state]);

    const currentState = getCurrentState();

    // Validation function
    const runValidation = useCallback(
      async (inputValue: string) => {
        if (!validate) return;

        try {
          const validators = Array.isArray(validate) ? validate : [validate];
          const results = await Promise.all(validators.map(validator => validator(inputValue)));

          // Find first failed validation or return success
          const failedResult = results.find(result => !result.isValid);
          const finalResult = failedResult ?? { isValid: true, type: 'success' as const };

          setValidationResult(finalResult);
          onValidationChange?.(finalResult);
        } catch (error) {
          const errorResult = {
            isValid: false,
            message: 'Validation error',
            type: 'error' as const,
          };
          setValidationResult(errorResult);
          onValidationChange?.(errorResult);
        }
      },
      [validate, onValidationChange]
    );

    // Handle input change
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;

        onChange?.(event);
        onValueChange?.(newValue);

        if (validateOn === 'change') {
          void runValidation(newValue);
        }
      },
      [onChange, onValueChange, validateOn, runValidation]
    );

    // Handle input blur
    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        onBlur?.(event);

        if (validateOn === 'blur') {
          void runValidation(event.target.value);
        }
      },
      [onBlur, validateOn, runValidation]
    );

    // Determine aria-describedby
    const getAriaDescribedBy = useCallback(() => {
      const descriptions: string[] = [];

      if (ariaDescribedBy) descriptions.push(ariaDescribedBy);
      if (description) descriptions.push(descriptionId);
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check if any message exists
      if (error || warning || success || validationResult?.message) {
        descriptions.push(errorId);
      }

      return descriptions.length > 0 ? descriptions.join(' ') : undefined;
    }, [
      ariaDescribedBy,
      description,
      descriptionId,
      error,
      warning,
      success,
      validationResult,
      errorId,
    ]);

    // Generate component classes
    const wrapperClasses = wrapperVariants({ fullWidth, className });
    const inputClasses = inputVariants({
      variant,
      size,
      state: currentState,
      fullWidth,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check for icon/prefix presence
      hasLeftIcon: Boolean(leftIcon || prefix),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic to check for icon/suffix/loading presence
      hasRightIcon: Boolean(rightIcon || suffix || isLoading),
      className: inputClassName,
    });

    // Get current error/warning/success message
    const getCurrentMessage = () => {
      if (error) return { message: error, type: 'error' as const };
      if (validationResult?.message && validationResult.type === 'error') {
        return { message: validationResult.message, type: 'error' as const };
      }
      if (warning) return { message: warning, type: 'warning' as const };
      if (validationResult?.message && validationResult.type === 'warning') {
        return { message: validationResult.message, type: 'warning' as const };
      }
      if (success) return { message: success, type: 'success' as const };
      if (validationResult?.message && validationResult.type === 'success') {
        return { message: validationResult.message, type: 'success' as const };
      }
      return null;
    };

    const currentMessage = getCurrentMessage();

    return (
      <div className={wrapperClasses}>
        {/* Label */}
        {label && (
          <InputLabel htmlFor={id} isRequired={required} className={labelClassName}>
            {label}
          </InputLabel>
        )}

        {/* Input wrapper with icons */}
        <div className="relative">
          {/* Left icon or prefix */}
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/prefix */}
          {(leftIcon || prefix) && (
            <div className={iconVariants({ position: 'left', size })}>
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/prefix */}
              {leftIcon || prefix}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={id}
            type={type}
            className={inputClasses}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-label={ariaLabel}
            aria-describedby={getAriaDescribedBy()}
            aria-invalid={ariaInvalid ?? currentState === 'error'}
            aria-required={ariaRequired ?? required}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={onFocus}
            {...props}
          />

          {/* Right icon, suffix, or loading spinner */}
          {isLoading ? (
            <InputLoadingSpinner size={size!} />
          ) : // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/suffix
          rightIcon || suffix ? (
            <div className={iconVariants({ position: 'right', size })}>
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/suffix */}
              {rightIcon || suffix}
            </div>
          ) : null}
        </div>

        {/* Description */}
        {description && <InputDescription id={descriptionId}>{description}</InputDescription>}

        {/* Error/Warning/Success message */}
        {currentMessage && (
          <InputError id={errorId} type={currentMessage.type}>
            {currentMessage.message}
          </InputError>
        )}
      </div>
    );
  }
);

// Display name for debugging
Input.displayName = 'Input';

// Export input variants type for external use
export type InputVariantsProps = VariantProps<typeof inputVariants>;
