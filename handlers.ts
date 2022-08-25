import { App, Block, asCodedError, KnownBlock, FileInstallationStore, SlashCommand } from '@slack/bolt';
import { WebClient } from '@slack/web-api'
import { fetchTomato, patchTomato, fetchUsers } from './repository';
import { Tomato } from './interface'

let app: App;

export function init(_app: App) {
  app = _app;
  app.command('/tomato', async ({ command, ack, say, client }) => {
    await ack();
    const text = `<@${command.user_id}> has started a tomato \`${command.text}\` for 5 mins...`;
    await ensure(async () => {
      const res = await say({
        username: command.user_name,
        text, mrkdwn: true,
        blocks: createBlocks(text, command.user_id),
      });
      const now = new Date();
      const until = +new Date(+now + mins(5))
      const tomato = await patchTomato({
        user: command.user_id,
        channel: command.channel_id,
        text,
        lastTs: res.ts!,
        mins: 5,
        until,
        status: 'started',
      });
      await startTomato(tomato, client, command.text);
    }, client, command);
  });

  app.action('stop-tomato', async ({ ack, action, client, body, respond}) => {
    await ack();
    if (body.type !== 'block_actions') return;
    if (action.type !== 'button') return;
    if (!body.message) return;
    const tomato = await fetchTomato(action.value);
    if (tomato.lastTs === body.message.ts) {
      await stopTomato(tomato, client);
    } else {
      await updateTomato({
        ...tomato,
        channel: body.channel!.id,
        lastTs: body.message.ts,
        status: 'stopped',
      });
    }
  });

}


async function ensure(func: Function, client: WebClient, command: SlashCommand) {
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
        await client.conversations.join({ channel: command.channel_id });
        await func();
      }
    }
  }
}

async function startTomato(tomato: Tomato, client: WebClient, status: string) {
  const token = getToken(tomato.user);

  await client.dnd.setSnooze({ num_minutes: tomato.mins, token })
  await client.users.profile.set({ token, profile: JSON.stringify({
    status_text: status,
    status_emoji: ':tomato:'
  })});
  await client.users.setPresence({ presence: 'away', token })
}

async function stopTomato(tomato: Tomato, client: WebClient) {
  const now = new Date();
  const ts = tomato.lastTs;
  const token = getToken(tomato.user);
  await client.dnd.endSnooze({ token });
  await client.users.profile.set({ token, name: 'status_text', value: '원래대로' });
  await client.users.setPresence({ presence: 'auto', token });
  tomato.status = (+now - tomato.until) <= 0 ? 'stopped' : 'completed';
  await updateTomato(tomato);
  tomato.until = Number.MAX_SAFE_INTEGER;
  tomato.lastTs = '';
  await patchTomato(tomato);
  if (!ts) return;
  await client.chat.postMessage({
    thread_ts: ts,
    channel: 'C03V6AS6GV6',
    text: tomato.status === 'stopped' ? '중간에 중단했습니다' : '정상적으로 종료했습니다',
    metadata: JSON.stringify({
      event_type: 'tomato_completed',
      event_payload: {
        haha: true
      }
    })
  });
}

function getToken(user: string) {
  return process.env.SLACK_USER_TOKEN!;
}

function createBlocks(text: string, user: string): KnownBlock[] {
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
          value: [user].join('-'),
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

function createRemainingTimeBlock(tomato: Tomato): KnownBlock {
  const now = +new Date();
  return {
    type: 'section',
    text: {
      type: 'plain_text',
      text: `:hourglass_flowing_sand: 대충 ${Math.floor((tomato.until - now) / 1000)}초 남음`,
      emoji: true,
    }
  }
}

function createStopBlock(tomato: Tomato): KnownBlock {
  if (tomato.status !== 'started') {
    return {
      type: 'section',
      text: {
        text: 'stopped :tomato:', type: 'mrkdwn'
      }
    };
  }
  return {
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Stop :tomato:',
          emoji: true
        },
        value: [tomato.user].join('-'),
        action_id: 'stop-tomato'
      }
    ]
  }
}

async function updateTomato(tomato: Tomato) {
  const msg = await app.client.conversations.history({
    channel: tomato.channel,
    inclusive: true,
    latest: tomato.lastTs,
    limit: 1,
  })
  const tomatoMessage = msg.messages![0];
  if (!tomatoMessage.blocks || tomatoMessage.blocks.length < 1) return;

  const blocks = [
    tomatoMessage.blocks![0] as Block,
    createStopBlock(tomato),
  ];
  if (tomato.status === 'started') {
    blocks.push(createRemainingTimeBlock(tomato));
  }

  await app.client.chat.update({
    channel: tomato.channel,
    ts: tomato.lastTs,
    text: tomatoMessage.text,
    blocks,
  });
}

export async function expireTomatoes() {
  console.log('interval', new Date().toLocaleString())
  const users = await fetchUsers();
  const tomatoes = await Promise.all(users.map(u => fetchTomato(u)));
  const started = tomatoes.filter(t => t.status === 'started');

  await Promise.all(started.map(updateTomato));

  const now = +new Date();
  const expired = started.filter(t => t.until < now);

  console.log(`expired ${expired.length} / ${started.length}`);
  console.log(expired);

  await Promise.all(expired.map(tomato => stopTomato(tomato, app.client)));
}
