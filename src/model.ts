import * as dynamoose from "dynamoose";
import { Item } from 'dynamoose/dist/Item'
import { TableOptionsOptional } from 'dynamoose/dist/Table'
import { AppInstallation, Tomato } from './interface'

const AppInstallationSchema = new dynamoose.Schema({
  PK: {
    type: String,
    required: true,
    hashKey: true
  },
  SK: {
    type: String,
    required: true,
    rangeKey: true,
  },
  BYTEAMPK: {
    type: String,
    required: true,
    index: {
      name: 'BYTEAM',
      throughput: 'ON_DEMAND'
    }
  },

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
  saveUnknown: true,
  timestamps: true
});

class AppInstallationItem extends Item implements AppInstallation {
  PK = '';
  SK = '';
  BYTEAMPK = '';

  id = '';
  user = {
    token: '',
    id: ''
  };
  team = {
    id: '',
    name: ''
  };
  bot = {
    token: '',
    userId: '',
    id: ''
  }
}

export const AppInstallationModel = dynamoose.model<AppInstallationItem>('installations', AppInstallationSchema);

export function AppInstallationModelPK(uid: string) {
  return 'USER#'+uid;
}
export function AppInstallationModelSK() {
  return 'USER#INFO';
}
export function AppInstallationModelGS1PK(team: string) {
  return 'TEAM#'+team;
}

class TomatoItem extends Item implements Tomato {
  PK = '';
  SK = '';
  BYSTATUSPK = '';
  BYTEAMPK = '';

  user = '';
  lastTs = '';
  mins = 0;
  until = Number.MAX_SAFE_INTEGER;
  text = '';
  channel = '';
  status: 'started' | 'stopped' | 'completed' = 'stopped';
  botToken = '';
  userToken = '';
}

const TomatoSchema = new dynamoose.Schema({
  PK: {
    type: String,
    required: true,
    hashKey: true
  },
  SK: {
    type: String,
    required: true,
    rangeKey: true,
  },
  BYTEAMPK: {
    type: String,
    required: true,
    index: {
     name: 'BYTEAM',
     throughput: 'ON_DEMAND'
    }
  },
  BYSTATUSPK: {
    type: String,
    required: true,
    index: {
      name: 'BYSTATUS',
      rangeKey: 'until',
      throughput: 'ON_DEMAND'
    }
  },

  user: String,
  lastTs: String,
  mins: Number,
  until: Number,
  text: String,
  channel: String,
  status: {
    type: String,
    enum: ['started', 'stopped', 'completed']
  },
  botToken: String,
  userToken: String,
}, {
  saveUnknown: true,
  timestamps: true,
});

export const TomatoModel = dynamoose.model<TomatoItem>('tomato', TomatoSchema);

export function TomatoPK(uid: string) {
  return 'USER#' + uid;
}

export function TomatoSK() {
  return 'USER#TOMATO';
}

export function TomatoGS1PK(status: string) {
  return 'TOMATO#STATUS#'+status;
}

export function BYTEAMPK(team: string) {
  return 'TEAM#'+team;
}

let initialized: Promise<any>;

export async function initModels(migrate: boolean = false) {
  const tableOptions: TableOptionsOptional = {
    create: false,
    waitForActive: false,
    update: false,
    throughput: 'ON_DEMAND',
  };
  if (migrate) {
    tableOptions.create = true;
    tableOptions.waitForActive = true;
    // tableOptions.update = true;
  }
  if (!migrate && initialized) return initialized;
  initialized = new Promise((res, rej) => {
    const tables = [
      new dynamoose.Table('tomato-dev', [TomatoModel, AppInstallationModel], tableOptions)
    ];
    Promise.allSettled(tables.map(t => t.initialize())).then(res).catch(e => {
      console.error(e);
      if (e.name === 'ResourceInUseException') return res({});
      return rej(e);
    });
  });
  return initialized;
}
