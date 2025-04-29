// src/tracking/tracking.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DriverLocation, DriverLocationSchema } from './entities/driver-location.entity';
import { TrackingService } from './tracking.service';
import { TrackingResolver } from './tracking.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DriverLocation.name, schema: DriverLocationSchema }]),
    HttpModule, // Pour les appels HTTP à OpenStreetMap
  ],
  providers: [TrackingService, TrackingResolver],
})
export class TrackingModule {}