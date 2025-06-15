import { Resolver, Query, Mutation } from "@nestjs/graphql"
import type { TrackingService } from "./tracking.service"
import { DriverLocation } from "./entities/driver-location.entity"

@Resolver(() => DriverLocation)
export class TrackingResolver {
  constructor(private readonly trackingService: TrackingService) {}

  @Query(() => DriverLocation, { nullable: true })
  async getDriverCurrentLocation(driverId: string): Promise<DriverLocation | null> {
    return this.trackingService.getDriverCurrentLocation(driverId)
  }

  @Query(() => DriverLocation, { nullable: true })
  async getDriverLocationForCourse(driverId: string, courseId: string): Promise<DriverLocation | null> {
    return this.trackingService.getDriverLocationForCourse(driverId, courseId)
  }

  @Query(() => [DriverLocation])
  async getDriverLocationHistory(driverId: string, limit: number): Promise<DriverLocation[]> {
    return this.trackingService.getDriverLocationHistory(driverId, undefined, undefined, limit)
  }

  @Query(() => [DriverLocation])
  async getAllActiveDriversLocations(): Promise<DriverLocation[]> {
    return this.trackingService.getAllActiveDriversLocations()
  }

  @Mutation(() => Boolean)
  async startCourseTracking(driverId: string, courseId: string): Promise<boolean> {
    await this.trackingService.startCourseTracking(driverId, courseId)
    return true
  }

  @Mutation(() => Boolean)
  async stopCourseTracking(driverId: string): Promise<boolean> {
    await this.trackingService.stopCourseTracking(driverId)
    return true
  }
}
