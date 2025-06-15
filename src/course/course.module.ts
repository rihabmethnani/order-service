import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CourseService } from './course.service';
import { CourseResolver } from './course.resolver';
import { Course, CourseSchema } from './entities/course.entity';
import { Order, OrderSchema } from '@/order/entities/order.entity/order.entity';
import { RouteOptimizationModule } from '@/route-optimization/route-optimization.module';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    RouteOptimizationModule,
  ],
  providers: [CourseService, CourseResolver],
  exports: [CourseService, MongooseModule]
})
export class CourseModule {}
