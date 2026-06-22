import type { Request, Response, NextFunction } from 'express';

// ── Global mocks ──────────────────────────────────────────────

jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}));

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
  }));
});

jest.mock('multer', () => {
  const multerFn: any = () => ({
    single: () => (req: Request, _res: Response, next: NextFunction) => {
      if (req.path.includes('avatar') || req.path.includes('images')) {
        if (!(req as any)._multerSkip) {
          (req as any).file = {
            fieldname: 'avatar',
            originalname: 'test.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            destination: './uploads',
            filename: '1234567890-abc123.jpg',
            path: './uploads/1234567890-abc123.jpg',
            size: 12345,
          };
        }
      }
      next();
    },
    diskStorage: jest.fn(),
  });
  multerFn.diskStorage = jest.fn((opts: any) => opts);
  multerFn.FileFilterCallback = jest.fn();
  return multerFn;
});

jest.mock('../config/uploads', () => ({
  upload: {
    single: () => (req: Request, _res: Response, next: NextFunction) => {
      if ((req as any)._multerSkip) return next();
      (req as any).file = {
        fieldname: 'avatar',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: './uploads',
        filename: '1234567890-abc123.jpg',
        path: './uploads/1234567890-abc123.jpg',
        size: 12345,
      };
      next();
    },
    array: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    none: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  },
  getAvatarUrl: jest.fn((filename: string) => `/uploads/${filename}`),
}));

// Mock pg Pool
const mockPgClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
};

export const mockPgPool = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue(mockPgClient),
};

jest.mock('../config/postgres', () => ({
  pgPool: mockPgPool,
  connectPostgres: jest.fn().mockResolvedValue(undefined),
}));

// Mock ioredis
const redisStore = new Map<string, string>();

export const mockRedis = {
  get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) || null)),
  setex: jest.fn((key: string, _ttl: number, value: string) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((key: string) => {
    redisStore.delete(key);
    return Promise.resolve(1);
  }),
  ping: jest.fn().mockResolvedValue('PONG'),
  connect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

export function clearRedisStore() {
  redisStore.clear();
}

jest.mock('../config/redis', () => ({
  redis: mockRedis,
  connectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock Kafka
const mockProducer = {
  connect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

const mockConsumer = {
  connect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

const mockKafkaInstance = {
  producer: jest.fn().mockReturnValue(mockProducer),
  consumer: jest.fn().mockReturnValue(mockConsumer),
};

jest.mock('../config/kafka', () => ({
  kafka: mockKafkaInstance,
  connectKafka: jest.fn().mockResolvedValue(undefined),
  getProducer: jest.fn().mockReturnValue(mockProducer),
  createConsumer: jest.fn().mockResolvedValue(mockConsumer),
  startMessageConsumer: jest.fn().mockResolvedValue(undefined),
}));

// Mock Socket.IO
const mockIo = {
  to: jest.fn().mockReturnValue({
    emit: jest.fn(),
  }),
  emit: jest.fn(),
  on: jest.fn(),
  use: jest.fn(),
};

jest.mock('../socket', () => ({
  getIO: jest.fn().mockReturnValue(mockIo),
  initSocket: jest.fn().mockReturnValue(mockIo),
}));

// Mock Mongoose
const mockMongooseModel = (modelName: string) => {
  const create = jest.fn();
  const find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]), limit: jest.fn().mockReturnThis() });
  const findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  const findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  const findByIdAndDelete = jest.fn().mockResolvedValue(null);
  const findByIdAndUpdate = jest.fn().mockResolvedValue(null);
  const findOneAndDelete = jest.fn().mockResolvedValue(null);
  const findOneAndUpdate = jest.fn().mockResolvedValue(null);
  const deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
  const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
  const save = jest.fn().mockResolvedValue(undefined);

  const mockModel: any = {
    modelName,
    create,
    find,
    findOne,
    findById,
    findByIdAndDelete,
    findByIdAndUpdate,
    findOneAndDelete,
    findOneAndUpdate,
    deleteMany,
    updateMany,
    aggregate: jest.fn().mockResolvedValue([]),
    save,
    toObject: jest.fn(),
  };

  // Allow chaining
  create.mockResolvedValue({ _id: 'mock-id', ...({} as any) });
  findById.mockReturnValue(mockModel);
  mockModel.lean = jest.fn().mockResolvedValue(null);

  return mockModel;
};

export const mockMessage = mockMongooseModel('Message');
export const mockConversation = mockMongooseModel('Conversation');
export const mockGroup = mockMongooseModel('Group');

const mongooseMock = {
  connect: jest.fn().mockResolvedValue(undefined),
  connection: {
    on: jest.fn(),
    readyState: 1,
  },
  model: jest.fn((name: string) => {
    if (name === 'Message') return mockMessage;
    if (name === 'Conversation') return mockConversation;
    if (name === 'Group') return mockGroup;
    return mockMongooseModel(name);
  }),
  Schema: function Schema() {
    return {
      index: jest.fn(),
      pre: jest.fn(),
      post: jest.fn(),
    };
  },
  Types: {
    ObjectId: class ObjectId {
      toHexString() { return '000000000000000000000000'; }
    },
  },
};

(mongooseMock.Schema as any).Types = mongooseMock.Types;

jest.mock('mongoose', () => mongooseMock);

// Mock jsonwebtoken — MUST be a fully standalone mock
jest.mock('jsonwebtoken', () => {
  const tokenStore = new Map<string, any>();

  return {
    sign: jest.fn().mockImplementation((payload: any, _secret: string, _options?: any) => {
      const token = `jwt-mock-${Math.random().toString(36).slice(2)}`;
      tokenStore.set(token, payload);
      return token;
    }),
    verify: jest.fn().mockImplementation((token: string, _secret: string) => {
      if (token === 'invalid-token' || token.startsWith('invalid')) {
        throw new Error('jwt malformed');
      }
      if (token.startsWith('jwt-mock-')) {
        const payload = tokenStore.get(token);
        if (payload) return payload;
      }
      return { userId: 'test-user-id', phone: '+51999000001' };
    }),
    decode: jest.fn(),
    JsonWebTokenError: class extends Error {
      name = 'JsonWebTokenError';
    },
  };
});

// Mock express-rate-limit to pass through
jest.mock('express-rate-limit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock swagger
jest.mock('../config/swagger', () => ({
  swaggerSpec: {},
  swaggerUi: {
    serve: (_req: Request, _res: Response, next: NextFunction) => next(),
    setup: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  },
}));

beforeEach(() => {
  clearRedisStore();
});

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.MEDIA_LOCAL_PATH = './uploads';
  process.env.MEDIA_STORAGE = 'local';
});
