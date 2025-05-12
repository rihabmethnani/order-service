import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { IncidentService } from './incident.service';
import { IncidentResolver } from './incident.resolver';
import { Incident, IncidentSchema } from './entities/incident.entity';
import { OrderModule } from '@/order/order.module';
import { RabbitMQModule } from '@/RabbitMq/rabbitmq.module';
import { HistoryModule } from '@/history/history.module';



@Module({
  imports: [
    MongooseModule.forFeature([{ name: Incident.name, schema: IncidentSchema }]),
    OrderModule,
    RabbitMQModule,
    HistoryModule,
  ],
  providers: [IncidentService, IncidentResolver],
  exports: [IncidentService],
})
export class IncidentModule {}
