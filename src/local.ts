import * as dynamoose from 'dynamoose';
import { initModels } from "./model"

async function main() {
  dynamoose.aws.ddb.set(new dynamoose.aws.ddb.DynamoDB({
    region: 'ap-northeast-2'
  }));
  // dynamoose.aws.ddb.local();
  (await dynamoose.logger()).providers.set(console);
  await initModels(true);
}
main();
