import { Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor() {
    this.init();
  }

  async init() {
    try {
      // Établir une connexion avec RabbitMQ
      this.connection = await amqp.connect('amqp://localhost');
      this.channel = await this.connection.createChannel();

      // Déclarer un exchange dédié aux notifications
      await this.channel.assertExchange('notifications_events', 'topic', { durable: true });

      console.log('Connected to RabbitMQ and exchange declared.');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
    }
  }

  async publishEvent(eventType: string, payload: any) {
    const message = JSON.stringify({ eventType, payload });
    if (!this.channel) {
      console.error('RabbitMQ channel is not initialized.');
      return;
    }

    // Publier le message dans l'exchange
    this.channel.publish('notifications_events', '', Buffer.from(message));
    console.log(`Published event: ${eventType}`, payload);
  }
}