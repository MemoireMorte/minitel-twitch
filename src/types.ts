export type UserRole = 'broadcaster' | 'moderator' | 'viewer';

export interface ChatMessage {
  username: string;
  message: string;
  role: UserRole;
}

export type SubEventType = 'sub' | 'resub' | 'subgift' | 'anonsubgift' | 'submysterygift' | 'raid';

export interface SubEvent {
  username: string;
  type: SubEventType;
  months?: number;
  viewers?: number;
}
