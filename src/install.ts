import { App, LogLevel, ExpressReceiver } from '@slack/bolt';
import serverlessExpress from '@vendia/serverless-express';
import { DDInstallationStore } from './installation-store'
import { initModels } from './model'

const expressReceiver = new ExpressReceiver({
  installerOptions: {
    userScopes: ['dnd:read', 'dnd:write', 'users.profile:write', 'users:write', 'chat:write'],
    stateVerification: false,
  },
  logLevel: LogLevel.DEBUG,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || 'stataSecret',
  scopes: ['channels:join', 'chat:write', 'chat:write.customize', 'commands', 'channels:history'],
  installationStore: new DDInstallationStore({}),
  processBeforeResponse: true
});

new App({
  receiver: expressReceiver
});

let serverlessExpressInstance: any;

module.exports.handler = async function handler (event: any, context: any) {
  if (!serverlessExpressInstance) {
    await initModels();
    serverlessExpressInstance = serverlessExpress({ app: expressReceiver. app });
  }

  return serverlessExpressInstance(event, context)
}
