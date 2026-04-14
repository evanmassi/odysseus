/**
 * Researcher Modal
 *
 * Create or link researcher profiles to user accounts.
 */
import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createResearcherProfileSchema,
  type CreateResearcherProfile,
  type AdminResearcher,
} from '@odysseus/shared-schemas';
import { Plus, User, Mail, Building2, Briefcase, Dna } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { AuthInput } from '@shared/ui/primitives';
import { withAsyncHandler } from '@shared/utils/asyncErrorHandler';

export interface ResearcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create-only' | 'select-or-create';
  username?: string;
  unlinkedResearchers?: AdminResearcher[];
  onSuccess: () => void;
  onCreateResearcher: (data: CreateResearcherProfile) => Promise<void>;
  onLinkExisting: (researcherId: string) => Promise<void>;
}

export function ResearcherModal({
  isOpen,
  onClose,
  mode,
  username,
  unlinkedResearchers = [],
  onSuccess,
  onCreateResearcher,
  onLinkExisting,
}: ResearcherModalProps) {
  const [actionMode, setActionMode] = useState<'create' | 'select'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateResearcherProfile>({
    resolver: zodResolver(createResearcherProfileSchema),
  });

  const handleCreate = async (data: CreateResearcherProfile) => {
    await withAsyncHandler(() => onCreateResearcher(data), {
      setLoading: setIsSubmitting,
      successMessage: 'Researcher added successfully',
      errorMessage: 'Failed to add researcher',
      onSuccess: () => {
        reset();
        onSuccess();
        onClose();
      },
    });
  };

  const handleLinkExisting = async (researcherId: string) => {
    await withAsyncHandler(() => onLinkExisting(researcherId), {
      setLoading: setIsSubmitting,
      successMessage: 'Researcher linked successfully',
      errorMessage: 'Failed to link researcher',
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    });
  };

  const handleClose = () => {
    reset();
    setActionMode('create');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={mode === 'create-only' ? 'Add Researcher' : `Link Researcher to ${username}`}
      icon={<Dna size={24} />}
      onClose={handleClose}
      className="max-w-2xl"
    >
      {mode === 'select-or-create' && (
        <div className="mb-4 flex space-x-4 border-b border-border pb-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={actionMode === 'create'}
              onChange={() => setActionMode('create')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-secondary-foreground">
              Add New Researcher
            </span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={actionMode === 'select'}
              onChange={() => setActionMode('select')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-secondary-foreground">
              Link Existing Researcher
            </span>
          </label>
        </div>
      )}

      {(mode === 'create-only' || actionMode === 'create') && (
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="firstName"
              label="First Name"
              icon={<User size={16} />}
              placeholder="First name"
              required
              control={control}
              errorMessage={errors.firstName?.message}
            />
            <FormField
              name="lastName"
              label="Last Name"
              icon={<User size={16} />}
              placeholder="Last name"
              required
              control={control}
              errorMessage={errors.lastName?.message}
            />
          </div>

          <FormField
            name="email"
            label="Email"
            type="email"
            icon={<Mail size={16} />}
            placeholder="name@institution.edu"
            required
            control={control}
            errorMessage={errors.email?.message}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              name="department"
              label="Department"
              icon={<Building2 size={16} />}
              placeholder="Department name"
              control={control}
              errorMessage={errors.department?.message}
            />
            <FormField
              name="position"
              label="Position"
              icon={<Briefcase size={16} />}
              placeholder="Title or role"
              control={control}
              errorMessage={errors.position?.message}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Plus size={16} />}
            >
              {mode === 'create-only' ? 'Add' : 'Add & Link'}
            </Button>
          </div>
        </form>
      )}

      {mode === 'select-or-create' && actionMode === 'select' && (
        <div className="space-y-2">
          {unlinkedResearchers.length > 0 ? (
            unlinkedResearchers.map(researcher => (
              <div
                key={researcher.id}
                className="border border-border rounded p-3 flex items-center justify-between hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-card-foreground">
                    {researcher.firstName} {researcher.lastName}
                  </div>
                  {researcher.email && (
                    <div className="text-xs text-muted-foreground">{researcher.email}</div>
                  )}
                  {researcher.position && (
                    <div className="text-xs text-muted-foreground">{researcher.position}</div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => handleLinkExisting(researcher.id)}
                  disabled={isSubmitting}
                >
                  Select
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No unlinked researchers available</p>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}

interface FormFieldProps {
  name: keyof CreateResearcherProfile;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  type?: 'text' | 'email';
  required?: boolean;
  control: ReturnType<typeof useForm<CreateResearcherProfile>>['control'];
  errorMessage?: string;
}

function FormField({
  name,
  label,
  icon,
  placeholder,
  type = 'text',
  required,
  control,
  errorMessage,
}: FormFieldProps) {
  return (
    <div>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <AuthInput
            id={name}
            label={label}
            type={type}
            icon={icon}
            placeholder={placeholder}
            required={required}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            state={errorMessage ? 'error' : 'default'}
          />
        )}
      />
      {errorMessage && <p className="text-xs text-danger-text mt-1 ml-1">{errorMessage}</p>}
    </div>
  );
}
