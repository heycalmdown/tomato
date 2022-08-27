import { App, LogLevel, ExpressReceiver, InstallationStore, Installation, Logger, InstallationQuery } from '@slack/bolt';
import serverlessExpress from '@vendia/serverless-express';
import { AppInstallationModel } from './model'

class DDInstallationStore implements InstallationStore {
  constructor ({}) {

  }

  async storeInstallation<AuthVersion extends 'v1' | 'v2'>(installation: Installation<AuthVersion, boolean>, logger?: Logger): Promise<void> {
    console.info(installation);
    const item = new AppInstallationModel(installation);
    item.id = item.user?.id;
    if (installation.isEnterpriseInstall && installation.enterprise !== undefined) {
      throw new Error('not yet implemented')
    }
    if (installation.team !== undefined) {
      await item.save();
      return;
    }
    throw new Error('Failed saving installation data to installationStore');
  }

  async fetchInstallation(installQuery: InstallationQuery<boolean>, logger?: Logger): Promise<Installation<'v1' | 'v2', boolean>> {
    console.info(installQuery);
    throw new Error('not yet implemented');
    if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
      throw new Error('not yet implemented');
    }
    if (installQuery.teamId !== undefined) {
    }
    throw new Error('Failed fetching installation');
  }

  async deleteInstallation(installQuery: InstallationQuery<boolean>, logger?: Logger): Promise<void> {
    console.log(installQuery);
    throw new Error('not yet implemented');
    if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
    }
    if (installQuery.teamId !== undefined) {
    }
    throw new Error('Failed to delete installation');
  }
}

const expressReceiver = new ExpressReceiver({
  installerOptions: {
    userScopes: ['dnd:read', 'dnd:write', 'users.profile:write', 'users:write', 'chat:write'],
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

const app = new App({
  receiver: expressReceiver
});

module.exports.handler = serverlessExpress({
  app: expressReceiver.app
});
