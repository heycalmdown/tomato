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

async function startTomato(token: string, client: WebClient) {
    await client.dnd.setSnooze({ num_minutes: 2, token })
    await client.users.profile.set({ token, profile: JSON.stringify({
      status_text: '바뻐',
      status_emoji: ':tomato:'
    })});
    await client.users.setPresence({ presence: 'away', token })
}

async function stopTomato(token: string, client: WebClient, ts: string) {
    await client.dnd.endSnooze({ token });
    await client.users.profile.set({ token, name: 'status_text', value: '원래대로' });
    await client.users.setPresence({ presence: 'auto', token });
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

app.command('/tomato', async ({ command, ack, respond, say, client, logger}) => {
  await ack();
  await ensure(async () => {
    const startMessage = await say({
      username: command.user_name,
      icon_url: 'https://ca.slack-edge.com/T03UK3NE9RA-U03UDLNP5NZ-g029a0f65d07-512',
      text: [`${command.user_name}님이 토마토 시작... for 2 mins`, `• ${command.text}`].filter(Boolean).join('\n'),
      mrkdwn: true,
    })
    const token = process.env.SLACK_USER_TOKEN!;
    await startTomato(token, client);
    setTimeout(() => {
      stopTomato(token, client, startMessage.ts!);
    }, 2 * 1000);
  }, client, command);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 4000);

  console.log('⚡️ Bolt app is running!');
})();
