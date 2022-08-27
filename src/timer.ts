import { initModels } from './model';
import { expireTomatoes, init } from './handlers'
import { App, LogLevel } from '@slack/bolt'

const app = new App({
	clientId: process.env.SLACK_CLIENT_ID,
	clientSecret: process.env.SLACK_CLIENT_SECRET,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
})

init(app);

module.exports.handler = async () => {
  await initModels();
  await expireTomatoes();
  return { test: 1 };
}
