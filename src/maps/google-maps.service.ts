import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class GoogleMapsService {
  constructor(private readonly httpService: HttpService) {}

  async getOptimizedRoute(
    pointDepart: string,
    pointArrivee: string[],
  ): Promise<{ distance: number; duration: number; optimizedOrder: number[] }> {
    if (!pointDepart || !pointArrivee || pointArrivee.length < 1) {
      throw new InternalServerErrorException('Les adresses de départ et d’arrivée sont requises.');
    }

    const waypoints = pointArrivee.map(p => `via:${p}`).join('|');

    try {
      const response = await lastValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/directions/json', {
          params: {
            origin: pointDepart,
            destination: pointArrivee[pointArrivee.length - 1],
            waypoints: `optimize:true|${waypoints}`,
            key: 'AIzaSyBi_K_fbDAjFSt-8CeTb-5e-MwF3E6BtRs',
          },
        }),
      );

      const route = response.data.routes?.[0];
      if (!route || !route.waypoint_order) {
        throw new InternalServerErrorException(
          'La réponse de Google Maps est invalide, "optimizedOrder" est manquant ou mal formé.',
        );
      }

      const distance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0); // mètres
      const duration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0); // secondes
      const optimizedOrder = route.waypoint_order;

      return { distance, duration, optimizedOrder };
    } catch (error: any) {
      console.error('Erreur Google Maps:', error?.response?.data || error.message || error);
      throw new InternalServerErrorException("Erreur lors de l'appel à Google Maps API");
    }
  }
}
