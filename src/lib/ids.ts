/** Collision-resistant id for client-side entities (messages, events). */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
