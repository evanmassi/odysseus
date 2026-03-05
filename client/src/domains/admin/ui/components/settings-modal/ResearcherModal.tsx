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
import { useForm } from 'react-hook-form';

import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';
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
    register,
    handleSubmit,
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

      {/* Create Form - Label-in-Border Theme */}
      {(mode === 'create-only' || actionMode === 'create') && (
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* First Name */}
            <div>
              <div
                className={`auth-input-container ${errors.firstName ? 'border-2 border-danger-border' : 'border-border'}`}
              >
                <label
                  htmlFor="firstName"
                  className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.firstName ? 'text-danger-text' : 'text-secondary-foreground'}`}
                >
                  First Name <span className="text-danger-bg">*</span>
                </label>
                <div className="relative px-3 py-2">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    {...register('firstName')}
                    id="firstName"
                    className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
                    placeholder="First name"
                  />
                </div>
              </div>
              {errors.firstName && (
                <p className="text-xs text-danger-text mt-1 ml-1">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <div
                className={`auth-input-container ${errors.lastName ? 'border-2 border-danger-border' : 'border-border'}`}
              >
                <label
                  htmlFor="lastName"
                  className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.lastName ? 'text-danger-text' : 'text-secondary-foreground'}`}
                >
                  Last Name <span className="text-danger-bg">*</span>
                </label>
                <div className="relative px-3 py-2">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    {...register('lastName')}
                    id="lastName"
                    className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
                    placeholder="Last name"
                  />
                </div>
              </div>
              {errors.lastName && (
                <p className="text-xs text-danger-text mt-1 ml-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <div
              className={`auth-input-container ${errors.email ? 'border-2 border-danger-border' : 'border-border'}`}
            >
              <label
                htmlFor="email"
                className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.email ? 'text-danger-text' : 'text-secondary-foreground'}`}
              >
                Email <span className="text-danger-bg">*</span>
              </label>
              <div className="relative px-3 py-2">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
                  placeholder="name@institution.edu"
                />
              </div>
            </div>
            {errors.email && (
              <p className="text-xs text-danger-text mt-1 ml-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Department */}
            <div>
              <div className="auth-input-container border-border">
                <label
                  htmlFor="department"
                  className="absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground"
                >
                  Department
                </label>
                <div className="relative px-3 py-2">
                  <Building2
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    {...register('department')}
                    id="department"
                    className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
                    placeholder="Department name"
                  />
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <div className="auth-input-container border-border">
                <label
                  htmlFor="position"
                  className="absolute -top-2 left-3 bg-card px-1 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground"
                >
                  Position
                </label>
                <div className="relative px-3 py-2">
                  <Briefcase
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    {...register('position')}
                    id="position"
                    className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-muted-foreground placeholder:opacity-45"
                    placeholder="Title or role"
                  />
                </div>
              </div>
            </div>
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

      {/* Select List */}
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
