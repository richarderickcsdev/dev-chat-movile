import { Kafka, Producer, Consumer } from 'kafkajs';
import { env } from './env';
import { logger } from '../lib/logger';

export const kafka = new Kafka({
  clientId: 'dev-chat-api',
  brokers: env.KAFKA_BROKERS,
  retry: { retries: 3 },
});

let producer: Producer | null = null;

export async function connectKafka(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  logger.info('Kafka producer conectado');
}

export function getProducer(): Producer {
  if (!producer) throw new Error('Kafka producer no inicializado');
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}
