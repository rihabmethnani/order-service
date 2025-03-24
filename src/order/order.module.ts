import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';
import { HttpModule } from '@nestjs/axios';
import { Order, OrderSchema } from './entities/order.entity/order.entity';
import { RabbitMQModule } from '../RabbitMq/rabbitmq.module';
import { UserCacheService } from '../RabbitMq/user-cache.service';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]), 
    HttpModule, 
    RabbitMQModule,
    HistoryModule, 
  ],
  providers: [
    OrderResolver,
    OrderService,
    UserCacheService,
  ],
  exports: [OrderService, MongooseModule],
})
export class OrderModule {}