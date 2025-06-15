// route-optimization.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../order/entities/order.entity/order.entity';
import { RouteOptimizationService } from './route-optimization-service';
import { GeocodingService } from '@/geocoding/geocoding.service';
import { UserCacheService } from '@/RabbitMq/user-cache.service';
import { RoutingModule } from '@/routing/routing.module';
import { ConfigModule } from '@nestjs/config';
import { RoutingService } from '@/routing/routing.service';

@Module({
  imports: [
     ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
 
  ],
  providers: [
    RouteOptimizationService,
    GeocodingService,
    UserCacheService,
     RoutingService,
  ],
  exports: [
    RouteOptimizationService,
  ],
})
export class RouteOptimizationModule {}