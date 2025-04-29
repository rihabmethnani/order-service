import { Module } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQService } from './rabbitmq.service';

@Module({
  providers: [
    UserCacheService, // Fournir le service
    RabbitMQConsumer, // Fournir le consommateur RabbitMQ
    RabbitMQService
  ],
  exports: [UserCacheService,RabbitMQService], // Exporter UserCacheService pour qu'il soit utilisable dans d'autres modules
})
export class RabbitMQModule {}