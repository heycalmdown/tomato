export type UserList = string[];

export interface Tomato {
  user: string;
  lastTs: string;
  mins: number;
  until: number;
  text: string;
  channel: string;
  status: 'started' | 'stopped' | 'completed';
}
