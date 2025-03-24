import { Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createClient } from 'redis';

@Injectable()
export class RabbitMQConsumer {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private redisClient: any;

  constructor() {
    this.redisClient = createClient({
      url: 'redis://localhost:6379',
    });

    this.redisClient.connect();
    this.init();
  }

  async init() {
    try {
      // Étape 1 : Se connecter à RabbitMQ
      this.connection = await amqp.connect('amqp://localhost');
      this.channel = await this.connection.createChannel();

      // Étape 2 : Créer l'échange 'user_events'
      const exchangeName = 'user_events';
      await this.channel.assertExchange(exchangeName, 'topic', { durable: true });
      // Étape 3 : Créer une file d'attente temporaire et la lier à l'échange
      const queue = await this.channel.assertQueue('', { exclusive: true });
      this.channel.bindQueue(queue.queue, exchangeName, '');

      // Étape 4 : Consommer les messages
      this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          const event = JSON.parse(msg.content.toString());
          console.log('Received event:', event);

          switch (event.eventType) {
            case 'USER_CREATED':
            case 'USER_UPDATED':
              // Mettre à jour Redis avec les informations de l'utilisateur
              await this.redisClient.set(
                `user:${event.payload._id}`,
                JSON.stringify(event.payload),
                {
                  EX: 3600, // Expiration après 1 heure
                },
              );
              break;

            case 'USER_DELETED':
              // Supprimer l'utilisateur de Redis
              await this.redisClient.del(`user:${event.payload._id}`);
              break;

              case 'USER_LOGGED_IN':
                // Enregistrer l'utilisateur dans Redis avec son rôle
                await this.redisClient.set(
                  `user:${event.payload.userId}`,
                  JSON.stringify({
                    _id: event.payload.userId,
                    email: event.payload.email,
                    role: event.payload.role,
                  }),
                  {
                    EX: 3600, // Stocker pendant 1 heure
                  }
                );
                break;

            case 'ROLE_VALIDATION_SUCCESS':
              // Enregistrer la validation réussie dans Redis (optionnel)
              await this.redisClient.set(
                `role_validation:${event.payload.userId}`,
                JSON.stringify({ success: true, ...event.payload }),
                {
                  EX: 3600,
                },
              );
              break;

            case 'ROLE_VALIDATION_FAILED':
              // Enregistrer l'échec de validation dans Redis (optionnel)
              await this.redisClient.set(
                `role_validation:${event.payload.userId}`,
                JSON.stringify({ success: false, ...event.payload }),
                {
                  EX: 3600,
                },
              );
              break;

            case 'CRITICAL_ERROR':
              // Enregistrer les erreurs critiques dans Redis (optionnel)
              await this.redisClient.set(
                `critical_error:${event.payload.action}:${event.payload.userId}`,
                JSON.stringify(event.payload),
                {
                  EX: 86400, // Stocker pendant 24 heures
                },
              );
              break;

            default:
              console.warn('Unknown event type:', event.eventType);
          }
        }
      }, { noAck: true });
    } catch (error) {
      console.error('Failed to connect to RabbitMQ or Redis:', error);
    }
  }
}