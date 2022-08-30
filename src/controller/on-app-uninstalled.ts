import { DDInstallationStore } from '../installation-store'

export async function onAppUninstalled(teamId: string, enterpriseId: string, isEnterpriseInstall: boolean) {
  await new DDInstallationStore({}).deleteInstallation({
    teamId, enterpriseId, isEnterpriseInstall, 
  });
}
