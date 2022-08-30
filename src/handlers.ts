import { App, Block, KnownBlock } from '@slack/bolt';
import { WebClient } from '@slack/web-api'
import { fetchTomato, patchTomato, fetchStartedTomatoes, getToken, deleteTomato } from './repository';
import { Tomato } from './interface'
import { DDInstallationStore } from './installation-store'
import { onTomato } from './controller/on-tomato'
import { onStopTomato } from './controller/on-stop-tomato'
import { onAppUninstalled } from './controller/on-app-uninstalled'
import { onTokensRevoked } from './controller/on-tokens-revoked'

export function init(app: App) {
  app.command('/tomato', async ({ command, ack, client }) => {
    await ack();
    console.log('/tomato')
    await onTomato(command.team_id, command.user_id, command.text, command.channel_id, client);
  });

  app.action('stop-tomato', async ({ ack, action, client, body}) => {
    await ack();
    console.log('stop-tomato')
    if (body.type !== 'block_actions') return;
    if (action.type !== 'button') return;
    if (!body.message) return;
    await onStopTomato(action.value, body.message.ts, body.channel!.id, client);
  });

  app.event('app_uninstalled', async ({ context, event }) => {
    console.log('uninstall', context, event);
    const { teamId, enterpriseId, isEnterpriseInstall } = context;
    await onAppUninstalled(teamId!, enterpriseId!, isEnterpriseInstall);
  });

  app.event('tokens_revoked', async ({ context, event }) => {
    console.log('tokens revoked', context, event);
    const { teamId, enterpriseId, isEnterpriseInstall } = context;
    await onTokensRevoked(teamId!, enterpriseId!, isEnterpriseInstall, event.tokens.oauth!);
  });
}
