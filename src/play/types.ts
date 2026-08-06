/** Shared contract for the per-type Play UIs. Each renderer owns its local input state and
 * reports the current submission + whether it is ready to score. */
export interface RendererProps<Payload = unknown> {
  payload: Payload;
  onSubmissionChange: (submission: unknown, ready: boolean) => void;
}
