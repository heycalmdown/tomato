import { AuthorizeResult } from '@slack/bolt'
import { WebClient } from '@slack/web-api'
import { AppInstallation, Tomato } from './interface'
import { TomatoModel, AppInstallationModel, AppInstallationModelSK, AppInstallationModelPK, TomatoPK, TomatoSK, TomatoGS1PK, AppInstallationModelGS1PK, BYTEAMPK } from './model';

export function genUid(teamId: string, userId: string): string {
  return `${teamId}-${userId}`;
}

export async function fetchTomato(uid: string): Promise<Tomato> {
  console.log('fetchTomato');
  const t = await TomatoModel.get({ PK: TomatoPK(uid), SK: TomatoSK() });
  console.log(t);
  return t;
}

export async function patchTomato(tomato: Tomato) {
  const auth = await getTokenByUser(tomato.user)
  const item = new TomatoModel(tomato);
  item.PK = TomatoPK(tomato.user);
  item.SK = TomatoSK();
  item.BYSTATUSPK = TomatoGS1PK(tomato.status);
  item.BYTEAMPK = BYTEAMPK(auth.teamId!);
  await item.save();
  return tomato;
}

export async function deleteTomato(uid: string) {
  const items = await TomatoModel.query('PK').eq(TomatoPK(uid)).exec();
  await Promise.allSettled(items.map(i => i.delete()));
  return;
}

const tokenCache = new Map<string, AuthorizeResult>();

export async function getToken(uid: string) {
  const cache = await getTokenByUser(uid);
  return cache.userToken;
}

export async function getTokenByUser(uid: string): Promise<AuthorizeResult> {
  if (tokenCache.has(uid)) {
    console.log('using cache');
    return tokenCache.get(uid)!;
  }
  const item = await AppInstallationModel.get({PK: AppInstallationModelPK(uid), SK: AppInstallationModelSK() });
  const cache: AuthorizeResult = {
    botToken: item.bot.token,
    userToken: item.user.token,
    botId: item.bot.id,
    botUserId: item.bot.userId,
  };
  tokenCache.set(uid, cache);
  return cache;
}

export async function getTokens({teamId, userId}: { teamId: string, userId: string }): Promise<AuthorizeResult> {
  const uid = genUid(teamId, userId);
  if (tokenCache.has(uid)) {
    console.log('using cache');
    return tokenCache.get(uid)!;
  }
  console.log('before query');
  const res = await AppInstallationModel.query({ PK: AppInstallationModelPK(uid), SK: AppInstallationModelSK() }).exec();
  console.log('after query');
  if (res.count === 0) {
    console.log('fallback');
    const cond = AppInstallationModel.query('BYTEAMPK').eq(AppInstallationModelGS1PK(teamId)).using('BYTEAM');
    const req = await cond.getRequest();
    console.log('req', req);
    const res = await AppInstallationModel.query('BYTEAMPK').eq(AppInstallationModelGS1PK(teamId)).using('BYTEAM').exec();
    if (res.count > 0) {
      const token = res[0].bot.token
      const client = new WebClient(token)
      await client.chat.postMessage({ channel: userId, text: 'Add to Slack 다시 해줘잉\nhttps://tomato.hyperwork.co/slack/install'})
    }
    throw new Error('No matching authorizations');
  }
  const installation = res[0];
  const cache: AuthorizeResult = {
    botToken: installation.bot.token,
    userToken: installation.user.token,
    botId: installation.bot.id,
    botUserId: installation.bot.userId,
  };
  tokenCache.set(uid, cache);
  return cache;
}

export async function fetchStartedTomatoes(now: Date): Promise<Tomato[]> {
  const items = await TomatoModel.query('BYSTATUSPK').eq(TomatoGS1PK('started')).using('BYSTATUS').exec();
  console.log('items', items.length);
  return items;
}


export async function patchInstallation(install: AppInstallation) {
    console.info(install);
    if (install.team !== undefined && install.user) {
      const item = new AppInstallationModel(install);
      item.PK = AppInstallationModelPK(genUid(install.team.id, install.user.id));
      item.SK = AppInstallationModelSK();
      item.BYTEAMPK = AppInstallationModelGS1PK(install.team.id);
      await item.save();
    }
}

export async function deleteInstallation(query: any): Promise<void> {
    console.log(query);
    if (query.teamId !== undefined) {
      let cond = AppInstallationModel.scan('team.id').eq(query.teamId);
      if (query.userId) {
        cond = cond.and().where('id').eq(query.userId);
        tokenCache.delete(query.userId);
      }
      const res = await cond.exec();
      await Promise.allSettled(res.map(i => i.delete()))
      return;
    }
    throw new Error('Failed to delete installation');
}