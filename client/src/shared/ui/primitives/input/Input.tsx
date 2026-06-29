/**
 * Input Component
 *
 * Accessible input primitive with validation, multiple variants, and design system tokens.
 */

import React, { forwardRef, useState, useId, useCallback, useEffect, useRef } from 'react';

import { cva } from 'class-variance-authority';

import { OdysseusSpinner } from '@shared/ui/components/loading';

import { defaultInputProps } from './types';

import type { InputProps, InputRef, ValidationResult } from './types';

const FOCUS_SHADOW =
  'focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.30)] dark:focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]';

const inputVariants = cva(
  [
    'w-full relative',
    'text-foreground',
    'bg-[hsl(var(--input-well))] border border-line-faint',
    'placeholder:text-foreground/40',
    'transition-[border-color,background,box-shadow] duration-200',
    'hover:border-foreground/30',
    'focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04]',
    FOCUS_SHADOW,
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-faint',
    'read-only:cursor-default',
  ],
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-body-sm',
        sm: 'h-8 px-3 text-body',
        md: 'h-9 px-3 text-body',
        lg: 'h-12 px-4 text-body-lg',
        xl: 'h-14 px-5 text-body-lg',
      },

      state: {
        default: '',
        error: 'border-danger-border',
        warning: 'border-warning-border',
        success: 'border-success-border',
      },

      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },

      hasLeftIcon: {
        true: '',
        false: '',
      },

      hasRightIcon: {
        true: '',
        false: '',
      },
    },

    compoundVariants: [
      { hasLeftIcon: true, size: 'xs', className: 'pl-7' },
      { hasLeftIcon: true, size: 'sm', className: 'pl-8' },
      { hasLeftIcon: true, size: 'md', className: 'pl-9' },
      { hasLeftIcon: true, size: 'lg', className: 'pl-11' },
      { hasLeftIcon: true, size: 'xl', className: 'pl-12' },

      { hasRightIcon: true, size: 'xs', className: 'pr-7' },
      { hasRightIcon: true, size: 'sm', className: 'pr-8' },
      { hasRightIcon: true, size: 'md', className: 'pr-9' },
      { hasRightIcon: true, size: 'lg', className: 'pr-11' },
      { hasRightIcon: true, size: 'xl', className: 'pr-12' },
    ],

    defaultVariants: {
      size: 'md',
      state: 'default',
      fullWidth: false,
      hasLeftIcon: false,
      hasRightIcon: false,
    },
  }
);

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

interface InputLoadingSpinnerProps {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SPINNER_PX: Record<InputLoadingSpinnerProps['size'], number> = {
  xs: 12,
  sm: 16,
  md: 16,
  lg: 20,
  xl: 20,
};

const InputLoadingSpinner: React.FC<InputLoadingSpinnerProps> = ({ size }) => (
  <OdysseusSpinner size={SPINNER_PX[size]} className={iconVariants({ position: 'right', size })} />
);

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
    className={`block text-body-sm font-medium text-secondary-foreground mb-1.5 ${className}`}
  >
    {children}
    {isRequired && (
      <span className="text-danger-text ml-1" aria-label="required">
        *
      </span>
    )}
  </label>
);

interface InputDescriptionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

const InputDescription: React.FC<InputDescriptionProps> = ({ id, children, className = '' }) => (
  <p id={id} className={`text-caption text-muted-foreground mt-1 ${className}`}>
    {children}
  </p>
);

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
    <p id={id} className={`text-caption ${colors[type]} mt-1 ${className}`} role="alert">
      {children}
    </p>
  );
};

export const Input = forwardRef<InputRef, InputProps>(
  (
    {
      // Content props
      label,
      description,
      placeholder,

      // Styling props
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

    // Internal ref for reading DOM value (merged with forwarded ref)
    const internalRef = useRef<HTMLInputElement>(null);
    const mergedRef = useCallback(
      (node: HTMLInputElement | null) => {
        (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    // Track if date input has a value (for placeholder styling)
    const [dateHasValue, setDateHasValue] = useState(() => {
      if (type !== 'date') return false;
      return Boolean(value ?? defaultValue);
    });

    // Read DOM value after mount to handle uncontrolled mode (e.g., React Hook Form)
    useEffect(() => {
      if (type !== 'date') return;
      const frame = requestAnimationFrame(() => {
        if (internalRef.current) {
          setDateHasValue(Boolean(internalRef.current.value));
        }
      });
      return () => cancelAnimationFrame(frame);
    }, [type]);

    // Sync dateHasValue when controlled value changes
    useEffect(() => {
      if (type === 'date' && value !== undefined) {
        setDateHasValue(Boolean(value));
      }
    }, [type, value]);

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

        // Track date value for placeholder styling
        if (type === 'date') {
          setDateHasValue(Boolean(newValue));
        }

        if (validateOn === 'change') {
          void runValidation(newValue);
        }
      },
      [onChange, onValueChange, validateOn, runValidation, type]
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
        {label && (
          <InputLabel htmlFor={id} isRequired={required} className={labelClassName}>
            {label}
          </InputLabel>
        )}

        <div className="relative">
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/prefix */}
          {(leftIcon || prefix) && (
            <div className={iconVariants({ position: 'left', size })}>
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: show first available icon/prefix */}
              {leftIcon || prefix}
            </div>
          )}

          <input
            ref={mergedRef}
            id={id}
            type={type}
            className={`${inputClasses}${
              type === 'date'
                ? dateHasValue
                  ? ' has-value text-foreground'
                  : ' text-foreground/40'
                : ''
            }${type === 'number' ? ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}`}
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

        {description && <InputDescription id={descriptionId}>{description}</InputDescription>}

        {currentMessage && (
          <InputError id={errorId} type={currentMessage.type}>
            {currentMessage.message}
          </InputError>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
