import { Block, KnownBlock } from '@slack/bolt';
import { WebClient } from '@slack/web-api'
import { fetchTomato, patchTomato, fetchStartedTomatoes, getToken } from '../repository';
import { Tomato } from '../interface'
import { stopTomato, updateTomato } from '../service/tomato'

export async function onStopTomato(user: string, ts: string, channel: string, client: WebClient) {
  const tomato = await fetchTomato(user);
  if (tomato.lastTs === ts) {
    await stopTomato(tomato, client);
  } else {
    await updateTomato({
      ...tomato,
      channel,
      lastTs: ts,
      status: 'stopped',
    }, client);
  }
}
