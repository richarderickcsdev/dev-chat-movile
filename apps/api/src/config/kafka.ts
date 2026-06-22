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

export async function startMessageConsumer(): Promise<void> {
  try {
    const consumer = kafka.consumer({ groupId: 'dev-chat-message-consumer' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'message.events', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString();
        if (value) {
          try {
            const event = JSON.parse(value);
            logger.info({ event, topic, partition }, 'Evento Kafka recibido');
          } catch {
            logger.info({ raw: value }, 'Mensaje Kafka raw');
          }
        }
      },
    });

    logger.info('Kafka consumer de mensajes iniciado');
  } catch (err) {
    logger.warn({ err }, 'Kafka consumer no disponible (opcional en dev)');
  }
}
