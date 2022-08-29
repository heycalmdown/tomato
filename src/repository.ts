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

export async function getTokens({teamId, userId}: { teamId: string, userId: string }) {
  let cond = AppInstallationModel.scan('team.id').eq(teamId);
  if (userId) {
    cond = cond.and().where('id').eq(userId);
  }
  const res = await cond.exec();
  if (res.count === 0) {
    throw new Error('No matching authorizations');
  }
  const installation = res[0];
  return {
    botToken: installation.bot.token,
    userToken: installation.user.token,
    botId: installation.bot.id,
    botUserId: installation.bot.userId,
  };
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
