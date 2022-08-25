import { readFile, writeFile } from 'node:fs/promises'
import { Tomato, UserList } from './interface'

export async function fetchTomato(user: string): Promise<Tomato> {
  const json = await readFile(`user-${user}.json`, { encoding: 'utf-8'});
  return JSON.parse(json)
}

export async function patchTomato(tomato: Tomato) {
  const users = await fetchUsers();
  users.push(tomato.user);
  await patchUsers(users);

  await writeFile(`user-${tomato.user}.json`, JSON.stringify(tomato));
  return tomato;
}

export async function fetchUsers(): Promise<UserList> {
  try {
    const json = await readFile(`users.json`, { encoding: 'utf-8'});
    const users = JSON.parse(json);
    const userSet = new Set<string>();
    users.forEach((u: string) => userSet.add(u));
    return Array.from(userSet.values());
  } catch {
    return [];
  }
}

export async function patchUsers(users: UserList) {
  await writeFile('users.json', JSON.stringify(users));
}
