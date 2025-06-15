import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TrackingService } from "./tracking.service"
import { TrackingResolver } from "./tracking.resolver"
import { TrackingGateway } from "./tracking.gateway"
import { DriverLocation, DriverLocationSchema } from "./entities/driver-location.entity"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DriverLocation.name, schema: DriverLocationSchema },
    ]),
  ],
  providers: [
    TrackingService,
    TrackingGateway,
  ],
})
export class TrackingModule {}

