import { App, Block, asCodedError, KnownBlock, FileInstallationStore, SlashCommand } from '@slack/bolt';
import { WebClient } from '@slack/web-api'
import { readFile, writeFile } from 'node:fs/promises'

function getDefaultOptions() {
  return {
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    stateSecret: 'my-state-secret',
  }
}

function createSocketMode() {
  return new App ({
    ...getDefaultOptions(),
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
  });
}

function createInstallationMode() {
  return new App ({
    ...getDefaultOptions(),
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    installationStore: new FileInstallationStore(),
  });
}

const app = createSocketMode();

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
  const ts = tomato.lastTs;
  const token = getToken(tomato.user);
  await client.dnd.endSnooze({ token });
  await client.users.profile.set({ token, name: 'status_text', value: '원래대로' });
  await client.users.setPresence({ presence: 'auto', token });
  tomato.lastTs = '';
  tomato.until = Number.MAX_SAFE_INTEGER;
  tomato.status = 'stopped';
  await patchTomato(tomato);
  if (!ts) return;
  await client.chat.postMessage({
    thread_ts: ts,
    channel: 'C03V6AS6GV6',
    text: '중간에 중단했습니다',
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

function mins(m: number) {
  return m * 60 * 1000;
}

app.action('stop-tomato', async ({ ack, action, client, body, respond}) => {
  await ack();
  if (body.type !== 'block_actions') return;
  if (action.type !== 'button') return;
  if (!body.message) return;
  body.message.blocks[1] = {
    type: 'section',
    text: {
      text: 'stopped :tomato:', type: 'mrkdwn'
    }
  };
  await client.chat.update({
    text: body.message.text,
    channel: body.channel!.id,
    ts: body.message.ts,
    blocks: body.message.blocks
  });
  await respond(body.message);
  const tomato = await fetchTomato(action.value);
  if (tomato.lastTs === body.message.ts) {
    await stopTomato(tomato, client);
  }
});

async function fetchTomato(user: string): Promise<Tomato> {
  const json = await readFile(`user-${user}.json`, { encoding: 'utf-8'});
  return JSON.parse(json)
}

type UserList = string[];

interface Tomato {
  user: string;
  lastTs: string;
  mins: number;
  until: number;
  text: string;
  channel: string;
  status: 'started' | 'stopped';
}

async function patchTomato(tomato: Tomato) {
  const users = await getUsers();
  users.push(tomato.user);
  await setUsers(users);

  await writeFile(`user-${tomato.user}.json`, JSON.stringify(tomato));
  return tomato;
}

async function getUsers(): Promise<UserList> {
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

async function setUsers(users: UserList) {
  await writeFile('users.json', JSON.stringify(users));
}

async function updateTomato(tomato: Tomato) {
  if (tomato.status !== 'started') return;
  const msg = await app.client.conversations.history({
    channel: tomato.channel,
    inclusive: true,
    latest: tomato.lastTs,
    limit: 1,
  })
  const tomatoMessage = msg.messages![0];
  const now = +new Date();
  tomatoMessage.blocks![2].text!.text = `:hourglass_flowing_sand: 대충 ${Math.floor((tomato.until - now) / 1000)}초 남음`
  const blocks = tomatoMessage.blocks!
  app.client.chat.update({
    channel: tomato.channel,
    ts: tomato.lastTs,
    text: tomatoMessage.text,
    blocks: blocks as Block[],
  });
}

async function expireTomatoes() {
  console.log('interval', new Date().toLocaleString())
  const users = await getUsers();
  const tomatoes = await Promise.all(users.map(u => fetchTomato(u)));
  const started = tomatoes.filter(t => t.status === 'started');

  await Promise.all(started.map(updateTomato));

  const now = +new Date();
  const expired = started.filter(t => t.until < now);

  console.log(`expired ${expired.length} / ${started.length}`);
  console.log(expired);

  await Promise.all(expired.map(tomato => stopTomato(tomato, app.client)));
}

setInterval(expireTomatoes, 1 * 60 * 1000);

(async () => {
  // Start your app
  await app.start(process.env.PORT || 4000);

  console.log('⚡️ Bolt app is running!');

  await expireTomatoes();
})();
