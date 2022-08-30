import { InstallationStore, Installation, Logger, InstallationQuery } from '@slack/bolt';
import { AppInstallationModel } from './model'
import { patchInstallation } from './repository'

export class DDInstallationStore implements InstallationStore {
  constructor ({}) {

  }

  async storeInstallation<AuthVersion extends 'v1' | 'v2'>(installation: Installation<AuthVersion, boolean>, logger?: Logger): Promise<void> {
    const item = {
      ...installation,
      id: installation.user.id
    }
    await patchInstallation(item);
  }

  async fetchInstallation(installQuery: InstallationQuery<boolean>, logger?: Logger): Promise<Installation<'v1' | 'v2', boolean>> {
    logger?.info('---------------');
    logger?.debug(installQuery);
    throw new Error('not yet implemented');
    if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
      throw new Error('not yet implemented');
    }
    if (installQuery.teamId !== undefined) {
    }
    throw new Error('Failed fetching installation');
  }

  async deleteInstallation(query: InstallationQuery<boolean>, logger?: Logger): Promise<void> {
    console.log(query);
    if (query.isEnterpriseInstall && query.enterpriseId !== undefined) {
      throw new Error('not yet implemented');
    }
    if (query.teamId !== undefined) {
      let cond = AppInstallationModel.scan('team.id').eq(query.teamId);
      if (query.userId) {
        cond = cond.and().where('id').eq(query.userId);
      }
      const res = await cond.exec();
      await Promise.allSettled(res.map(i => i.delete()))
      return;
    }
    throw new Error('Failed to delete installation');
  }
}
