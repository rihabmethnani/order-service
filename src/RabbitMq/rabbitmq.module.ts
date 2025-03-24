import { Module } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';
import { RabbitMQConsumer } from './rabbitmq.consumer';

@Module({
  providers: [UserCacheService,RabbitMQConsumer],
  exports: [UserCacheService], // Exportez le service pour qu'il soit utilisable dans d'autres modules
})
export class RabbitMQModule {}