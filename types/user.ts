export interface User {
  id: string;
  name: string;
  /** Initials shown as an avatar fallback. */
  initials: string;
  avatarUrl?: string;
}
