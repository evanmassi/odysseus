/**
 * Gateway Stack Transition
 *
 * Lags a gateway screen's state so the outgoing card plays its exit animation
 * before the incoming one renders. Wraps useDelayedTransition with the shared
 * exit duration and class.
 */

import { useDelayedTransition } from './useDelayedTransition';

// Matches the .animate-auth-stack-exit keyframe duration in modal-animations.css.
const STACK_EXIT_MS = 200;

export function useAuthStackTransition<T>(inputState: T): { state: T; exitClass: string } {
  const { displayed: state, isTransitioning } = useDelayedTransition(inputState, STACK_EXIT_MS);
  const exitClass = isTransitioning ? 'animate-auth-stack-exit' : '';
  return { state, exitClass };
}
