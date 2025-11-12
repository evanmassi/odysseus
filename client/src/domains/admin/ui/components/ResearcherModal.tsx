import { useState, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createResearcherProfileSchema, type CreateResearcherProfile, type AdminResearcher } from '@odysseus/shared-schemas';
import { X, Plus, RefreshCw, User, Mail, Building2, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils';

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
  onLinkExisting
}: ResearcherModalProps) {
  const [actionMode, setActionMode] = useState<'create' | 'select'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autofocus on first name input
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  // Focus trap with initial focus on first name field
  const trapRef = useFocusTrap({
    isOpen,
    restoreFocus: true,
    initialFocusRef: firstNameInputRef
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateResearcherProfile>({
    resolver: zodResolver(createResearcherProfileSchema)
  });

  const handleCreate = async (data: CreateResearcherProfile) => {
    setIsSubmitting(true);
    try {
      await onCreateResearcher(data);
      notifications.success('Researcher added successfully');
      reset();
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add researcher';
      notifications.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkExisting = async (researcherId: string) => {
    setIsSubmitting(true);
    try {
      await onLinkExisting(researcherId);
      notifications.success('Researcher linked successfully');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to link researcher';
      notifications.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setActionMode('create');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50">
      <div ref={trapRef} className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Lab Coat Theme (Off-white) */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ResearcherIcon size={20} className="text-gray-700" />
              <h2 className="text-lg font-bold text-gray-800">
                {mode === 'create-only' ? 'Add Researcher' : `Link Researcher to ${username}`}
              </h2>
            </div>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'select-or-create' && (
            <div className="mb-4 flex space-x-4 border-b border-gray-200 pb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={actionMode === 'create'}
                  onChange={() => setActionMode('create')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Add New Researcher</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={actionMode === 'select'}
                  onChange={() => setActionMode('select')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Link Existing Researcher</span>
              </label>
            </div>
          )}

          {/* Create Form - Label-in-Border Theme */}
          {(mode === 'create-only' || actionMode === 'create') && (
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <div className={`relative border rounded-lg transition-colors ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}>
                    <label
                      htmlFor="firstName"
                      className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.firstName ? 'text-red-600' : 'text-gray-700'}`}
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative px-3 py-2">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        {...register('firstName', {
                          setValueAs: (v) => v
                        })}
                        ref={(element) => {
                          // Merge react-hook-form ref with custom ref for autofocus
                          register('firstName').ref(element);
                          if (firstNameInputRef.current !== element) {
                            (firstNameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
                          }
                        }}
                        id="firstName"
                        className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                        placeholder="First name"
                      />
                    </div>
                  </div>
                  {errors.firstName && <p className="text-xs text-red-600 mt-1 ml-1">{errors.firstName.message}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <div className={`relative border rounded-lg transition-colors ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}>
                    <label
                      htmlFor="lastName"
                      className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.lastName ? 'text-red-600' : 'text-gray-700'}`}
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative px-3 py-2">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        {...register('lastName')}
                        id="lastName"
                        className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  {errors.lastName && <p className="text-xs text-red-600 mt-1 ml-1">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <div className={`relative border rounded-lg transition-colors ${errors.email ? 'border-red-500' : 'border-gray-300'}`}>
                  <label
                    htmlFor="email"
                    className={`absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide ${errors.email ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative px-3 py-2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      {...register('email')}
                      id="email"
                      type="email"
                      className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                      placeholder="name@institution.edu"
                    />
                  </div>
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1 ml-1">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Department - NOW BEFORE Position */}
                <div>
                  <div className="relative border border-gray-300 rounded-lg transition-colors">
                    <label
                      htmlFor="department"
                      className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
                    >
                      Department
                    </label>
                    <div className="relative px-3 py-2">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        {...register('department')}
                        id="department"
                        className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                        placeholder="Department name"
                      />
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <div className="relative border border-gray-300 rounded-lg transition-colors">
                    <label
                      htmlFor="position"
                      className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
                    >
                      Position
                    </label>
                    <div className="relative px-3 py-2">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        {...register('position')}
                        id="position"
                        className="w-full pl-7 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-[#9aa0a6] placeholder:opacity-45"
                        placeholder="Title or role"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex items-center space-x-2 text-sm"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>{mode === 'create-only' ? 'Add' : 'Add & Link'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Select List */}
          {mode === 'select-or-create' && actionMode === 'select' && (
            <div className="space-y-2">
              {unlinkedResearchers.length > 0 ? (
                unlinkedResearchers.map((researcher) => (
                  <div
                    key={researcher.id}
                    className="border border-gray-200 rounded p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {researcher.firstName} {researcher.lastName}
                      </div>
                      {researcher.email && <div className="text-xs text-gray-500">{researcher.email}</div>}
                      {researcher.position && <div className="text-xs text-gray-500">{researcher.position}</div>}
                    </div>
                    <button
                      onClick={() => handleLinkExisting(researcher.id)}
                      disabled={isSubmitting}
                      className="btn btn-primary text-xs px-3 py-1"
                    >
                      Select
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No unlinked researchers available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
