import { App } from '@slack/bolt';
import { init } from './handlers'
import { refreshTomatoes } from './service/tomato'

const app = new App ({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  stateSecret: 'my-state-secret',
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
});

init(app);

setInterval(refreshTomatoes, 1 * 60 * 1000);

(async () => {
  // Start your app
  await app.start(process.env.PORT || 4000);

  console.log('⚡️ Bolt app is running!');

  await refreshTomatoes();
})();
