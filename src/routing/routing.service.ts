import { BadRequestException, Injectable } from "@nestjs/common"
import axios from "axios"

export interface RoutePoint {
  lat: number
  lng: number
}

export interface DetailedRoute {
  coordinates: RoutePoint[]
  distance: number // en mètres
  duration: number // en secondes
  instructions?: string[]
}

@Injectable()
export class RoutingService {
  private readonly osrmUrl = "https://router.project-osrm.org"
  private readonly openRouteServiceUrl = "https://api.openrouteservice.org/v2/directions"

  // Clé API OpenRouteService (gratuite, 2000 requêtes/jour)
  private readonly openRouteServiceKey = process.env.OPENROUTESERVICE_API_KEY || "your_api_key_here"

  /**
   * Obtient le trajet routier détaillé entre plusieurs points
   */
  async getDetailedRoute(waypoints: RoutePoint[]): Promise<DetailedRoute> {
    if (waypoints.length < 2) {
      throw new Error("Au moins 2 points sont nécessaires pour calculer un trajet")
    }

    console.log(`Calculating detailed route for ${waypoints.length} waypoints`)

    try {
      // Essayer d'abord avec OSRM (gratuit, pas de clé API nécessaire)
      const osrmRoute = await this.getRouteFromOSRM(waypoints)
      if (osrmRoute) {
        console.log("Route calculated with OSRM")
        return osrmRoute
      }
    } catch (error) {
        console.error("OSRM failed:", error)
       throw new BadRequestException(`OSRM failed, trying OpenRouteService:",${(error as Error).message}`)
    }

    try {
      // Fallback sur OpenRouteService
      const orsRoute = await this.getRouteFromOpenRouteService(waypoints)
      if (orsRoute) {
        console.log("Route calculated with OpenRouteService")
        return orsRoute
      }
    } catch (error) {
      console.log("OpenRouteService failed:", error)
             throw new BadRequestException(`OpenRouteService failed:",${(error as Error).message}`)


    }

    // Fallback final : ligne droite
    console.log("Using fallback: straight line route")
    return this.createStraightLineRoute(waypoints)
  }

  /**
   * Calcule le trajet avec OSRM (Open Source Routing Machine)
   */
  private async getRouteFromOSRM(waypoints: RoutePoint[]): Promise<DetailedRoute | null> {
    try {
      // Construire l'URL avec les coordonnées
      const coordinates = waypoints.map((point) => `${point.lng},${point.lat}`).join(";")
      const url = `${this.osrmUrl}/route/v1/driving/${coordinates}`

      const response = await axios.get(url, {
        params: {
          overview: "full",
          geometries: "geojson",
          steps: true,
        },
        timeout: 10000,
      })

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0]

        // Décoder les coordonnées de la géométrie
        const coordinates = route.geometry.coordinates.map((coord) => ({
          lat: coord[1],
          lng: coord[0],
        }))

        // Extraire les instructions si disponibles
        const instructions =
          route.legs?.flatMap((leg) => leg.steps?.map((step) => step.maneuver?.instruction || "")).filter(Boolean) || []

        return {
          coordinates,
          distance: route.distance,
          duration: route.duration,
          instructions,
        }
      }

      return null
    } catch (error) {
      console.error("OSRM routing error:", error)
             throw new BadRequestException(`OSRM routing error:",${(error as Error).message}`)


      return null
    }
  }

  /**
   * Calcule le trajet avec OpenRouteService
   */
  private async getRouteFromOpenRouteService(waypoints: RoutePoint[]): Promise<DetailedRoute | null> {
    try {
      const coordinates = waypoints.map((point) => [point.lng, point.lat])

      const response = await axios.post(
        `${this.openRouteServiceUrl}/driving-car/geojson`,
        {
          coordinates,
          format: "geojson",
          instructions: true,
        },
        {
          headers: {
            Authorization: this.openRouteServiceKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      )

      if (response.data && response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0]
        const geometry = feature.geometry.coordinates

        // Convertir les coordonnées
        const coordinates = geometry.map((coord) => ({
          lat: coord[1],
          lng: coord[0],
        }))

        const properties = feature.properties
        const instructions =
          properties.segments
            ?.flatMap((segment) => segment.steps?.map((step) => step.instruction || ""))
            .filter(Boolean) || []

        return {
          coordinates,
          distance: properties.summary?.distance || 0,
          duration: properties.summary?.duration || 0,
          instructions,
        }
      }

      return null
    } catch (error) {
      console.error("OpenRouteService routing error:", error)
             throw new BadRequestException(`OpenRouteService routing error:",${(error as Error).message}`)

      return null
    }
    
  }

  /**
   * Crée un trajet en ligne droite comme fallback
   */
  private createStraightLineRoute(waypoints: RoutePoint[]): DetailedRoute {
    let totalDistance = 0
    const allCoordinates: RoutePoint[] = [waypoints[0]]

    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1]
      const curr = waypoints[i]

      // Ajouter des points intermédiaires pour une ligne plus lisse
      const intermediatePoints = this.generateIntermediatePoints(prev, curr, 5)
      allCoordinates.push(...intermediatePoints, curr)

      // Calculer la distance
      totalDistance += this.calculateHaversineDistance(prev, curr)
    }

    // Estimer la durée (vitesse moyenne 30 km/h)
    const duration = (totalDistance / 1000) * (3600 / 30)

    return {
      coordinates: allCoordinates,
      distance: totalDistance,
      duration,
      instructions: waypoints.map((_, index) => (index === 0 ? "Départ" : `Livraison ${index}`)),
    }
  }

  /**
   * Génère des points intermédiaires entre deux points
   */
  private generateIntermediatePoints(start: RoutePoint, end: RoutePoint, count: number): RoutePoint[] {
    const points: RoutePoint[] = []

    for (let i = 1; i <= count; i++) {
      const ratio = i / (count + 1)
      points.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
      })
    }

    return points
  }

  /**
   * Calcule la distance entre deux points avec la formule de Haversine
   */
  private calculateHaversineDistance(point1: RoutePoint, point2: RoutePoint): number {
    const R = 6371000 // Rayon de la Terre en mètres
    const φ1 = (point1.lat * Math.PI) / 180
    const φ2 = (point2.lat * Math.PI) / 180
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Calcule la distance et la durée entre deux points spécifiques
   */
  async getDistanceAndDuration(start: RoutePoint, end: RoutePoint): Promise<{ distance: number; duration: number }> {
    try {
      const route = await this.getDetailedRoute([start, end])
      return {
        distance: route.distance,
        duration: route.duration,
      }
    } catch (error) {
      // Fallback sur le calcul direct
      const distance = this.calculateHaversineDistance(start, end)
      const duration = (distance / 1000) * (3600 / 30) // 30 km/h

      return { distance, duration }
    }
  }
}
