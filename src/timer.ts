import { initModels } from './model';
import { expireTomatoes } from './handlers'

module.exports.handler = async () => {
  await initModels();
  await expireTomatoes();
  return { test: 1 };
}
