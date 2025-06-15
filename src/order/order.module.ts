import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';
import { RabbitMQModule } from '../RabbitMq/rabbitmq.module';
import { HistoryModule } from '../history/history.module';
import { RabbitMQConsumer } from '../RabbitMq/rabbitmq.consumer'; // Utilisez le chemin relatif approprié
import { CourseService } from '../course/course.service'; // Utilisez le chemin relatif approprié
import { Order, OrderSchema } from './entities/order.entity/order.entity';
import { CourseModule } from '@/course/course.module';
import { RouteOptimizationModule } from '@/route-optimization/route-optimization.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    HttpModule,
    RabbitMQModule,
    HistoryModule,
    CourseModule,
    RouteOptimizationModule
  ],
  providers: [
    OrderResolver,
    OrderService,
    RabbitMQConsumer,
    CourseService,
  ],
  exports: [OrderService], 
})
export class OrderModule {}
