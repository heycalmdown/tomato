import * as dynamoose from "dynamoose";
import { Item } from 'dynamoose/dist/Item'
import { Tomato } from './interface'

const AppInstallationSchema = new dynamoose.Schema({
  id: String,
  team: {
    type: Object,
    schema: {
      id: String,
      name: String
    }
  },
  user: {
    type: Object,
    schema: {
      token: String,
      scopes: {
        type: Array,
        schema: [String]
      },
      id: String,
    }
  },
  bot: {
    type: Object,
    schema: {
      scopes: {
        type: Array,
        schema: [String],
      },
      token: String,
      userId: String,
      id: String
    }
  }
}, {
  "saveUnknown": true,
  "timestamps": true
});

class AppInstallation extends Item {
  id?: string;
  user?: {
    token: string;
    id: string;
  };
  bot?: {
    token: string;
    userId: string;
    id: string;
  }
}

export const AppInstallationModel = dynamoose.model<AppInstallation>('installations', AppInstallationSchema, { initialize: false });

class TomatoItem extends Item implements Tomato {
  GS1PK = '';

  user = '';
  lastTs = '';
  mins = 0;
  until = Number.MAX_SAFE_INTEGER;
  text = '';
  channel = '';
  status: 'started' | 'stopped' | 'completed' = 'stopped';
}

const TomatoSchema = new dynamoose.Schema({
  user: {
    type: String,
    hashKey: true,
  },
  lastTs: String,
  mins: Number,
  until: {
    type: Number,
    rangeKey: true,
  },
  text: String,
  channel: String,
  status: {
    type: String,
    enum: ['started', 'stopped', 'completed']
  },
  GS1PK: {
    type: String,
    required: true,
    index: {
      name: 'GS1',
      rangeKey: 'until',
      throughput: 'ON_DEMAND'
    }
  },
});

export const TomatoModel = dynamoose.model<TomatoItem>('tomato', TomatoSchema, { initialize: false });

let initialized: Promise<any>;

export async function initModels() {
  if (initialized) return initialized;
  initialized = new Promise((res, rej) => {
    const tables = [
      new dynamoose.Table('installations', [AppInstallationModel], { throughput: 'ON_DEMAND', initialize: false, update: false }),
      new dynamoose.Table('tomato', [TomatoModel], { throughput: 'ON_DEMAND', initialize: false, update: false })
    ];
    Promise.allSettled(tables.map(t => t.initialize())).then(res).catch(e => {
      console.error(e);
      if (e.name === 'ResourceInUseException') return res({});
      return rej(e);
    });
  });
  return initialized;
}
