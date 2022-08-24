import { App, asCodedError, FileInstallationStore, SlashCommand } from '@slack/bolt';
import { WebClient } from '@slack/web-api'

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

async function startTomato(token: string, client: WebClient, status: string) {
    await client.dnd.setSnooze({ num_minutes: 2, token })
    await client.users.profile.set({ token, profile: JSON.stringify({
      status_text: status,
      status_emoji: ':tomato:'
    })});
    await client.users.setPresence({ presence: 'away', token })
}

async function stopTomato(token: string, client: WebClient, ts?: string) {
    await client.dnd.endSnooze({ token });
    await client.users.profile.set({ token, name: 'status_text', value: '원래대로' });
    await client.users.setPresence({ presence: 'auto', token });
    if (!ts) return;
    await client.chat.postMessage({
      thread_ts: ts,
      channel: 'C03V6AS6GV6',
      text: '끝',
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

app.command('/tomato', async ({ command, ack, say, client }) => {
  await ack();
  const text = `\`${command.text}\` for 5 mins...`;
  await ensure(async () => {
    await say({
      username: command.user_name,
      text, mrkdwn: true,
      blocks: [
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
                text: ':tomato: Stop',
                emoji: true
              },
              value: [command.user_id].join('-'),
              action_id: 'stop-tomato'
            }
          ]
        }
      ],
    })
    const token = process.env.SLACK_USER_TOKEN!;
    await startTomato(token, client, command.text);
  }, client, command);
});

app.action('stop-tomato', async ({ ack, action, client, body, respond}) => {
  await ack();
  if (body.type !== 'block_actions') return;
  if (action.type !== 'button') return;
  const token = getToken(action.value);
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
  await stopTomato(token, client, body.message?.ts);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 4000);

  console.log('⚡️ Bolt app is running!');
})();