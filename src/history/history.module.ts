import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryResolver } from './history.resolver';
import { HistoryService } from './history.service';
import { History, HistorySchema } from './entities/history.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'History', schema: HistorySchema }]), 
  ],
  providers: [HistoryService, HistoryResolver], 
  exports: [HistoryService],
})
export class HistoryModule {}