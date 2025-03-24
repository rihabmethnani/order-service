import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { History } from './entities/history.entity';
import { CreateHistoryInput } from './dto/create-history.input';

@Injectable()
export class HistoryService {
  constructor(@InjectModel('History') private historyModel: Model<History>) {}

  async create(createHistoryInput: CreateHistoryInput): Promise<History> {
    const newHistoryEvent = new this.historyModel(createHistoryInput);
    return await newHistoryEvent.save();
  }

  async findByOrderId(orderId: string): Promise<History[]> {
    const historyEvents = await this.historyModel.find({ orderId }).sort({ timestamp: -1 }).exec();
    if (!historyEvents || historyEvents.length === 0) {
      throw new NotFoundException(`No history found for order with ID ${orderId}`);
    }
    return historyEvents;
  }
}