import { initModels } from './model';

module.exports.handler = async () => {
  await initModels(true);
  return { test: 1 };
}
