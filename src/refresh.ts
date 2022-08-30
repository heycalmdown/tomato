import { initModels } from './model';
import { refreshTomatoes } from './service/tomato'

module.exports.handler = async () => {
  await initModels();
  await refreshTomatoes();
  return { test: 1 };
}
