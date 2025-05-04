import { HttpModule } from '@nestjs/axios';
import { GoogleMapsService } from './google-maps.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [HttpModule],
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class MapsModule {}
