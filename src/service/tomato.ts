import { Block, KnownBlock } from '@slack/bolt';
import { WebClient } from '@slack/web-api'
import { patchTomato, fetchStartedTomatoes, getTokenByUser } from '../repository';
import { Tomato } from '../interface'

export async function stopTomato(tomato: Tomato, client?: WebClient) {
  const tokens = await getTokenByUser(tomato.user);
  client = client || new WebClient(tokens.botToken);

  const now = new Date();
  const ts = tomato.lastTs;
  tomato.status = (+now - tomato.until) <= 0 ? 'stopped' : 'completed';
  await Promise.allSettled([
    client.dnd.endSnooze({ token: tokens.botToken }),
    client.users.profile.set({ token: tokens.userToken, name: 'status_text', value: '원래대로' }),
    client.users.setPresence({ presence: 'auto', token: tokens.userToken }),
    updateTomato(tomato, client),
  ])
  tomato.until = Number.MAX_SAFE_INTEGER;
  tomato.lastTs = '';
  await patchTomato(tomato);
  if (!ts) return;
  if (tomato.status === 'stopped') return;
  await client.chat.postMessage({
    thread_ts: ts,
    channel: tomato.channel,
    text: '정상적으로 종료했습니다',
    metadata: JSON.stringify({
      event_type: 'tomato_completed',
      event_payload: {
        haha: true
      }
    })
  });
}

function createRemainingTimeBlock(tomato: Tomato): KnownBlock {
  const now = +new Date();
  return {
    type: 'section',
    text: {
      type: 'plain_text',
      text: `:hourglass_flowing_sand: ${Math.floor((tomato.until - now) / 1000)} secs left appx.`,
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

export async function updateTomato(tomato: Tomato, client?: WebClient) {
  client = client || new WebClient(tomato.botToken);

  const msg = await client.conversations.history({
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

  await client.chat.update({
    channel: tomato.channel,
    ts: tomato.lastTs,
    text: tomatoMessage.text,
    blocks,
  });
}

export async function refreshTomatoes() {
  const now = new Date();
  console.log('interval', now.toLocaleString(), +now);

  const started = await fetchStartedTomatoes(now);
  if (started.length === 0) return;

  await Promise.all(started.map(t => updateTomato(t)));

  const expired = started.filter(t => t.until < +now);

  console.log(`expired ${expired.length} / ${started.length}`);
  console.log(expired);

  await Promise.all(expired.map(tomato => stopTomato(tomato)));
}