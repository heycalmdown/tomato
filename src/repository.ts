import { Tomato } from './interface'
import { TomatoModel, AppInstallationModel } from './model';

export async function fetchTomato(user: string): Promise<Tomato> {
  console.log('fetchTomato');
  const t = await TomatoModel.get(user);
  console.log(t);
  return t;
}

export async function patchTomato(tomato: Tomato) {
  const item = new TomatoModel(tomato);
  item.GS1PK = `TOMATO#STATUS#${item.status}`;
  await item.save();
  return tomato;
}

export async function getToken(user: string) {
  const item = await AppInstallationModel.get(user);
  return item.user?.token;
}

export async function fetchStartedTomatoes(now: Date): Promise<Tomato[]> {
  const items = await TomatoModel.query('GS1PK').eq('TOMATO#STATUS#started').using('GS1').exec();
  console.log('items', items.length);
  return items;
}

export async function fetchRottenTomatoes(now: Date) {
  console.log('111')
  const items = await TomatoModel.query('GS1PK').eq('TOMATO#STATUS#started').using('GS1').exec();
  // const items = await TomatoModel.query('GS1PK').eq('TOMATO#STATUS#started').and().where('until').le(+now).using('GS1').exec();
  console.log('items', items.length);
  return items;
}
