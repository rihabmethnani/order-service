// src/tracking/tracking.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { DriverLocation } from './entities/driver-location.entity';
import { UpdateDriverLocationInput } from './dto/update-driver-location.input';
import { GeoJSON } from './dto/geojson.type';
import { Route } from './dto/route.type';
import { AxiosError } from 'axios';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel('DriverLocation') private readonly driverLocationModel: Model<DriverLocation>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Enregistre la position GPS d'un chauffeur.
   */
  async updateDriverLocation(update: UpdateDriverLocationInput): Promise<void> {
    const location = new this.driverLocationModel({
      driverId: update.driverId,
      latitude: update.latitude,
      longitude: update.longitude,
      timestamp: new Date(),
    });
    await location.save();
  }

  /**
   * Récupère la position en temps réel d'un chauffeur.
   */
  async getDriverLocation(driverId: string): Promise<{ latitude: number; longitude: number }> {
    const location = await this.driverLocationModel
      .findOne({ driverId })
      .sort({ timestamp: -1 }) // Récupère la position la plus récente
      .exec();
  
    if (!location || location.latitude === undefined || location.longitude === undefined) {
      throw new NotFoundException(`No valid location found for driver with ID ${driverId}`);
    }
  
    return { latitude: location.latitude, longitude: location.longitude };
  }

  /**
   * Convertit une adresse en coordonnées GPS (latitude, longitude).
   */
  async getCoordinatesFromAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json`;

    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;

      if (!data || data.length === 0) {
        throw new NotFoundException('No coordinates found for the given address.');
      }

      const { lat, lon } = data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      throw new NotFoundException('Unable to retrieve coordinates for the given address.');
    }
  }

  /**
   * Convertit des coordonnées GPS (latitude, longitude) en une adresse.
   */
  async getAddressFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;

      if (!data || !data.display_name) {
        throw new NotFoundException('No address found for the given coordinates.');
      }

      return data.display_name;
    } catch (error) {
      console.error('Error fetching address:', error);
      throw new NotFoundException('Unable to retrieve address for the given coordinates.');
    }
  }

  async calculateOptimalRoute(
    driverId: string,
    destinationLatitude: number,
    destinationLongitude: number,
  ): Promise<Route> {
    // Récupérer la dernière position connue du driver
    const existingLocation: DriverLocation | null = await this.driverLocationModel
      .findOne({ driverId })
      .sort({ createdAt: -1 });
  
    if (!existingLocation) {
      throw new NotFoundException('Driver location not found.');
    }
  
    const originLatitude = existingLocation.latitude;
    const originLongitude = existingLocation.longitude;
  
    // URL pour calcul de l'itinéraire
    const url = `https://router.project-osrm.org/route/v1/driving/${originLongitude},${originLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson`;
  
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;
  
      if (!data || !data.routes || data.routes.length === 0) {
        throw new NotFoundException('Unable to calculate the optimal route.');
      }
  
      const route = data.routes[0];
  
      const optimalRoute: Route = {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
      };
  
      // Mettre à jour les données existantes
      existingLocation.latitude = originLatitude;
      existingLocation.longitude = originLongitude;
      existingLocation.timestamp = new Date();
      existingLocation.optimalRoute = optimalRoute;
  
      await existingLocation.save();
  
      return optimalRoute;
    } catch (error) {
      const axiosError = error as AxiosError;
  
      console.error(
        'Error fetching route:',
        axiosError.response?.data || axiosError.message || error,
      );
  
      throw new NotFoundException('Unable to calculate the optimal route.');
    }
  }
  
  
}