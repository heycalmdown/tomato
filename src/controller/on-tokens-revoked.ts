import { deleteTomato } from '../repository';
import { DDInstallationStore } from '../installation-store'

export async function onTokensRevoked(teamId: string, enterpriseId: string, isEnterpriseInstall: boolean, userTokens: string[]) {
  const store = new DDInstallationStore({});
  if (userTokens) {
    await Promise.all(userTokens.map(userId => store.deleteInstallation({
      teamId, enterpriseId, isEnterpriseInstall, userId,
    })))
    await Promise.all(userTokens.map(deleteTomato));
  }
}
