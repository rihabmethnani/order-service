// src/tracking/tracking.resolver.ts
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { TrackingService } from './tracking.service';
import { UpdateDriverLocationInput } from './dto/update-driver-location.input';
import { Coordinates } from './dto/coordinates.type';
import { CalculateRouteInput } from './dto/calculate-route.input';
import { Route } from './dto/route.type';

@Resolver()
export class TrackingResolver {
  constructor(private readonly trackingService: TrackingService) {}

  /**
   * Met à jour la position GPS d'un chauffeur.
   */
  @Mutation(() => Boolean)
  async updateDriverLocation(
    @Args('input') input: UpdateDriverLocationInput,
  ): Promise<boolean> {
    await this.trackingService.updateDriverLocation(input);
    return true;
  }

  /**
   * Récupère la position en temps réel d'un chauffeur.
   */
  @Query(() => Coordinates)
  async getDriverLocation(
    @Args('driverId') driverId: string,
  ): Promise<{ latitude: number; longitude: number }> {
    return this.trackingService.getDriverLocation(driverId);
  }

  /**
   * Convertit une adresse en coordonnées GPS.
   */
  @Query(() => Coordinates)
  async getCoordinatesFromAddress(
    @Args('address') address: string,
  ): Promise<{ latitude: number; longitude: number }> {
    return this.trackingService.getCoordinatesFromAddress(address);
  }

  /**
   * Convertit des coordonnées GPS en une adresse.
   */
  @Query(() => String)
  async getAddressFromCoordinates(
    @Args('latitude') latitude: number,
    @Args('longitude') longitude: number,

  ): Promise<string> {
    return this.trackingService.getAddressFromCoordinates(latitude,longitude);
  }
  
  @Query(() => Route)
  async calculateOptimalRoute(
    @Args('driverId') driverId: string,
    @Args('input') input: CalculateRouteInput,
  ): Promise<Route> {
    const { destinationLatitude, destinationLongitude } = input;
  
    if (
      destinationLatitude === undefined ||
      destinationLongitude === undefined
    ) {
      throw new Error('Destination coordinates must be provided.');
    }
  
    return this.trackingService.calculateOptimalRoute(
      driverId,
      destinationLatitude,
      destinationLongitude,
    );
  }
  
  
}