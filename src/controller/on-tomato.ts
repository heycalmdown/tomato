import { asCodedError, KnownBlock } from '@slack/bolt';
import { WebClient } from '@slack/web-api'

import { fetchTomato, patchTomato, getToken, getTokens, genUid } from '../repository';
import { Tomato } from '../interface'

export async function onTomato(team: string, user: string, command_text: string, channel: string, client: WebClient) {
    const interval = 25;
    const tomato = await fetchTomato(genUid(team, user));
    if (tomato?.status === 'started') {
      await client.chat.postMessage({
        thread_ts: tomato.lastTs,
        channel: tomato.channel,
        text: `>${command_text}`,
      })
      return;
    }
    const tokens = await getTokens({ teamId: team, userId: user });
    await ensure(async () => {
      const text = `<@${user}> has started a tomato for ${interval} mins...\n>${command_text}`;
      const res = await client.chat.postMessage({
        channel,
        username: 'Tomato',
        text, mrkdwn: true,
        blocks: createBlocks(text, genUid(team, user)),
      });
      const now = new Date();
      const until = +new Date(+now + mins(interval))
      const tomato: Tomato = {
        user: genUid(team, user),
        channel,
        text,
        lastTs: res.ts!,
        mins: interval,
        until,
        status: 'started',
        botToken: tokens.botToken!,
        userToken: tokens.userToken!,
      }
      await Promise.allSettled([
        startTomato(tomato, client, command_text),
        patchTomato(tomato),
      ]);
    }, channel, client);
}

async function ensure(func: Function, channel: string, client: WebClient) {
  try {
    await func()
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    const error = asCodedError(e);
    console.log(error)
    if (error.code === 'slack_webapi_platform_error') {
      const data = (error as any).data
      if (data?.error === 'not_in_channel') {
        await client.conversations.join({ channel });
        await func();
      }
    }
  }
}

async function startTomato(tomato: Tomato, client: WebClient, status: string) {
  const token = await getToken(tomato.user);
  await Promise.allSettled([
    client.dnd.setSnooze({ num_minutes: tomato.mins, token }),
    client.users.profile.set({ token, profile: JSON.stringify({
      status_text: status,
      status_emoji: ':tomato:'
    })}),
    client.users.setPresence({ presence: 'away', token }),
  ])
}

function createBlocks(text: string, uid: string): KnownBlock[] {
  return [
    {
      type: 'section',
      text: {
        text, type: 'mrkdwn',
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Stop :tomato:',
            emoji: true
          },
          value: [uid].join('-'),
          action_id: 'stop-tomato'
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: ':hourglass_flowing_sand: ',
        emoji: true,
      }
    }
  ]
}

function mins(m: number) {
  return m * 60 * 1000;
}
