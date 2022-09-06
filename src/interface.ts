export type UserList = string[];

export interface AppInstallation {
  id: string,
  user?: {
    token?: string;
    id: string;
  };
  team?: {
    id: string;
    name?: string;
  };
  bot?: {
    token?: string;
    userId?: string;
    id?: string;
  };
}

export interface Tomato {
  user: string;
  lastTs: string;
  mins: number;
  until: number;
  text: string;
  channel: string;
  status: 'started' | 'stopped' | 'completed';
  botToken: string;
  userToken: string;
}
