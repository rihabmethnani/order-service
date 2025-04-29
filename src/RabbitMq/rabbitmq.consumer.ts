
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQConsumer implements OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchangeName = 'user_events';
  private readonly queueName = 'order_service_queue';
  private isInitialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.init();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('🔌 RabbitMQ connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
    }
  }

   async init() {
    if (this.isInitialized) return;
    
    try {
      this.connection = await amqp.connect('amqp://localhost');
      this.connection.on('close', () => {
        console.log('❌ RabbitMQ connection closed, attempting to reconnect...');
        this.scheduleReconnect();
      });
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err);
      });

      this.channel = await this.connection.createChannel();
      this.channel.on('close', () => {
        console.log('❌ RabbitMQ channel closed');
      });
      this.channel.on('error', (err) => {
        console.error('❌ RabbitMQ channel error:', err);
      });

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.*');

      await this.channel.consume(this.queueName, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            console.log('📩 Event reçu:', event);
            
            await this.handleEvent(event);
            
            if (this.channel) {
              this.channel.ack(msg);
            }
          } catch (error) {
            console.error('❌ Erreur pendant le traitement du message:', error);
            if (this.channel && msg) {
              this.channel.nack(msg, false, false);
            }
          }
        }
      });

      this.isInitialized = true;
      this.reconnectAttempts = 0;
      console.log('✅ RabbitMQ Consumer prêt');
    } catch (error) {
      console.error('❌ Erreur RabbitMQ:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Max 30s delay
    
    console.log(`⌛ Tentative de reconnexion dans ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => this.init(), delay);
  }
 

  private async handleEvent(event: any) {
    try {
      const { eventType, payload } = event;
  
      switch (eventType) {
        case 'USER_CREATED':
          console.log('🎯 Nouveau utilisateur:', payload);
          // Mettre à jour le cache Redis si nécessaire
          break;
        case 'USER_UPDATED':
          console.log('🔄 Utilisateur modifié:', payload);
          // Mettre à jour le cache Redis
          break;
        case 'USER_DELETED':
          console.log('🗑️ Utilisateur supprimé:', payload);
          // Supprimer de Redis
          break;
        case 'USER_LOGGED_IN':
          console.log('🔐 Utilisateur connecté:', payload);
          break;
        case 'PARTNER_VALIDATED':
          console.log('✅ Partenaire validé:', payload);
          // Mettre à jour le statut dans Redis
          break;
        default:
          console.warn('⚠️ Type d`événement inconnu:', eventType);
      }
    } catch (error) {
      console.error('❌ Erreur pendant handleEvent:', error);
    }
  }
}