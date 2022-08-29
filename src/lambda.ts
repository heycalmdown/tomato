import { App, AwsLambdaReceiver, LogLevel } from '@slack/bolt'

import { init } from './handlers'
import { DDInstallationStore } from './installation-store'
import { initModels } from './model';
import { getTokens } from './repository';

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
	clientId: process.env.SLACK_CLIENT_ID,
	clientSecret: process.env.SLACK_CLIENT_SECRET,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  authorize: async ({ teamId, userId }) => {
    return getTokens({ teamId: teamId!, userId: userId! })
  },
  installationStore: new DDInstallationStore({}),
  receiver: awsLambdaReceiver,
  logLevel: LogLevel.DEBUG,
})

init(app);

module.exports.handler = async (event: any, context: any, callback: any) => {
  await initModels();
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
}
