import { Injectable } from '@nestjs/common';
import { Order } from '../order/entities/order.entity/order.entity';
import { TunisianRegion } from '../order/entities/order.entity/order.entity';
import { OptimizationResultDto } from './dto/optimization-result.dto';
import { Coordinates } from '@/tracking/dto/coordinates.type';
import { GeocodingService } from '@/geocoding/geocoding.service';
import { UserCacheService } from '@/RabbitMq/user-cache.service';
import { RoutePoint, RoutingService } from '@/routing/routing.service';



@Injectable()
export class RouteOptimizationService {
  constructor(
  private readonly geocodingService: GeocodingService,
  private readonly userCacheService: UserCacheService,
  private readonly routingService: RoutingService
) {}

  async optimizeRoute(startPoint: Coordinates, orders: Order[]): Promise<OptimizationResultDto> {
    console.log(`Starting route optimization for ${orders.length} orders`)
    console.log("Start point:", startPoint)

    if (!orders || orders.length === 0) {
      return {
        optimizedOrderIds: [],
        distance: 0,
        duration: 0,
        route: [startPoint],
        detailedRoute: [{ lat: startPoint.lat!, lng: startPoint.lng! }],
      }
    }

    if (orders.length === 1) {
      const orderCoords = await this.getOrderCoordinates(orders[0])
      const startRoutePoint = { lat: startPoint.lat!, lng: startPoint.lng! }
      const endRoutePoint = { lat: orderCoords.lat!, lng: orderCoords.lng! }

      // Obtenir le trajet routier détaillé
      const detailedRoute = await this.routingService.getDetailedRoute([startRoutePoint, endRoutePoint])

      return {
        optimizedOrderIds: [orders[0]._id.toString()],
        distance: detailedRoute.distance,
        duration: detailedRoute.duration,
        route: [startPoint, orderCoords],
        detailedRoute: detailedRoute.coordinates,
      }
    }

    // Récupérer les coordonnées de toutes les commandes à l'avance
    console.log("Geocoding all order addresses...")
    const orderCoordinates = new Map<string, Coordinates>()

    for (const order of orders) {
      const coords = await this.getOrderCoordinates(order)
      orderCoordinates.set(order._id.toString(), coords)
      console.log(`Order ${order._id} geocoded to:`, coords)

      // Petite pause entre les géocodages pour respecter les limites des API
      await this.sleep(200)
    }

    console.log("Starting route optimization algorithms...")

    // Algorithme du plus proche voisin (KNN) avec calcul de distance routière
    const optimizedRoute = await this.nearestNeighborAlgorithmWithRouting(startPoint, orders, orderCoordinates)

    // Amélioration avec 2-opt (simplifié pour éviter trop d'appels API)
    const improvedRoute = await this.twoOptOptimizationWithRouting(startPoint, optimizedRoute, orderCoordinates)

    // Construire le trajet final avec les vraies routes
    const finalWaypoints: RoutePoint[] = [
      { lat: startPoint.lat!, lng: startPoint.lng! },
      ...improvedRoute.map((order) => {
        const coords = orderCoordinates.get(order._id.toString())!
        return { lat: coords.lat!, lng: coords.lng! }
      }),
    ]

    console.log("Calculating detailed route for optimized waypoints...")
    const detailedRoute = await this.routingService.getDetailedRoute(finalWaypoints)

    console.log("Optimization completed:")
    console.log(`- Total distance: ${(detailedRoute.distance / 1000).toFixed(2)} km`)
    console.log(`- Estimated duration: ${(detailedRoute.duration / 60).toFixed(0)} minutes`)
    console.log(`- Route points: ${detailedRoute.coordinates.length}`)

    // Vérification finale
    if (detailedRoute.coordinates.length < 2) {
      throw new Error("Optimization failed: insufficient route points generated")
    }

    const result = {
      optimizedOrderIds: improvedRoute.map((order) => order._id.toString()),
      distance: detailedRoute.distance,
      duration: detailedRoute.duration,
      route: finalWaypoints.map((point) => ({ lat: point.lat, lng: point.lng })),
      detailedRoute: detailedRoute.coordinates,
    }

    console.log("Final optimization result:", {
      ...result,
      detailedRouteLength: result.detailedRoute.length,
    })
    return result
  }

  /**
   * Algorithme du plus proche voisin avec calcul de distance routière
   */
  private async nearestNeighborAlgorithmWithRouting(
    startPoint: Coordinates,
    orders: Order[],
    orderCoordinates: Map<string, Coordinates>,
  ): Promise<Order[]> {
    const unvisited = [...orders]
    const route: Order[] = []
    let currentPoint = { lat: startPoint.lat!, lng: startPoint.lng! }

    console.log("Running Nearest Neighbor Algorithm with routing...")

    while (unvisited.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY
      let closestOrderIndex = -1

      // Trouver l'ordre le plus proche en utilisant la distance routière
      for (let i = 0; i < Math.min(unvisited.length, 3); i++) {
        // Limiter à 3 pour éviter trop d'appels API
        const order = unvisited[i]
        const orderCoords = orderCoordinates.get(order._id.toString())!
        const endPoint = { lat: orderCoords.lat!, lng: orderCoords.lng! }

        try {
          const { distance } = await this.routingService.getDistanceAndDuration(currentPoint, endPoint)

          if (distance < minDistance) {
            minDistance = distance
            closestOrderIndex = i
          }
        } catch (error) {
          // Fallback sur la distance à vol d'oiseau
          const distance = await this.calculateDistance(
            { lat: currentPoint.lat, lng: currentPoint.lng },
            { lat: endPoint.lat, lng: endPoint.lng },
          )

          if (distance < minDistance) {
            minDistance = distance
            closestOrderIndex = i
          }
        }

        // Pause pour respecter les limites des API
        await this.sleep(100)
      }

      // Si on n'a pas testé tous les points, utiliser la distance à vol d'oiseau pour les autres
      for (let i = 3; i < unvisited.length; i++) {
        const order = unvisited[i]
        const orderCoords = orderCoordinates.get(order._id.toString())!
        const distance = await this.calculateDistance(
          { lat: currentPoint.lat, lng: currentPoint.lng },
          { lat: orderCoords.lat!, lng: orderCoords.lng! },
        )

        if (distance < minDistance) {
          minDistance = distance
          closestOrderIndex = i
        }
      }

      const closestOrder = unvisited[closestOrderIndex]
      route.push(closestOrder)

      const closestCoords = orderCoordinates.get(closestOrder._id.toString())!
      currentPoint = { lat: closestCoords.lat!, lng: closestCoords.lng! }
      unvisited.splice(closestOrderIndex, 1)

      console.log(`Added order ${closestOrder._id} to route (distance: ${minDistance.toFixed(0)}m)`)
    }

    return route
  }

  /**
   * Algorithme 2-opt simplifié avec routing
   */
  private async twoOptOptimizationWithRouting(
    startPoint: Coordinates,
    orders: Order[],
    orderCoordinates: Map<string, Coordinates>,
  ): Promise<Order[]> {
    if (orders.length <= 2) return orders

    console.log("Running simplified 2-opt optimization...")

    let bestRoute = [...orders]
    let bestDistance = await this.calculateTotalRouteDistanceSimple(startPoint, bestRoute, orderCoordinates)

    // Limiter les itérations pour éviter trop d'appels API
    const maxIterations = Math.min(10, orders.length * 2)
    let iteration = 0

    console.log(`Initial route distance: ${(bestDistance / 1000).toFixed(2)} km`)

    for (let iter = 0; iter < maxIterations; iter++) {
      let improved = false

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 2; j < bestRoute.length; j++) {
          const newRoute = [...bestRoute]
          this.reverseSubroute(newRoute, i + 1, j)

          const newDistance = await this.calculateTotalRouteDistanceSimple(startPoint, newRoute, orderCoordinates)

          if (newDistance < bestDistance) {
            const improvement = bestDistance - newDistance
            console.log(`2-opt improvement found: -${(improvement / 1000).toFixed(2)} km`)

            bestDistance = newDistance
            bestRoute = [...newRoute]
            improved = true
            break
          }
        }
        if (improved) break
      }

      if (!improved) break
      iteration++
    }

    console.log(`2-opt completed after ${iteration} iterations`)
    console.log(`Final route distance: ${(bestDistance / 1000).toFixed(2)} km`)

    return bestRoute
  }

  private reverseSubroute(route: Order[], start: number, end: number): void {
    while (start < end) {
      const temp = route[start]
      route[start] = route[end]
      route[end] = temp
      start++
      end--
    }
  }

  private async calculateTotalRouteDistanceSimple(
    startPoint: Coordinates,
    route: Order[],
    orderCoordinates: Map<string, Coordinates>,
  ): Promise<number> {
    let totalDistance = 0
    let currentPoint = { lat: startPoint.lat!, lng: startPoint.lng! }

    for (const order of route) {
      const orderCoords = orderCoordinates.get(order._id.toString())!
      const distance = await this.calculateDistance(currentPoint, orderCoords)
      totalDistance += distance
      currentPoint = { lat: orderCoords.lat!, lng: orderCoords.lng! }
    }

    return totalDistance
  }

  /**
   * Calcule la distance entre deux points en utilisant la formule de Haversine
   */
  private async calculateDistance(point1: Coordinates, point2: Coordinates): Promise<number> {
    const R = 6371000 // Rayon de la Terre en mètres
    const φ1 = this.toRadians(point1.lat!)
    const φ2 = this.toRadians(point2.lat!)
    const Δφ = this.toRadians(point2.lat! - point1.lat!)
    const Δλ = this.toRadians(point2.lng! - point1.lng!)

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const distance = R * c

    // Facteur de correction pour les routes réelles
    const roadFactor = 1.3
    return distance * roadFactor
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  /**
   * Récupère les coordonnées d'une commande en utilisant le géocodage amélioré
   */
  private async getOrderCoordinates(order: Order): Promise<Coordinates> {
    console.log(`Getting coordinates for order ${order._id}`)

    if (!order.clientId) {
      console.log(`Order ${order._id} has no clientId, using default coordinates`)
      return { lat: 36.8065, lng: 10.1815 } // Tunis par défaut
    }

    try {
      const user = await this.userCacheService.getUserById(order.clientId)

      if (!user) {
        console.log(`Client ${order.clientId} not found in cache, using default coordinates`)
        return { lat: 36.8065, lng: 10.1815 }
      }

      console.log(`Client data for order ${order._id}:`, {
        address: user.address,
        city: user.city,
        postalCode: user.postalCode,
        zoneResponsabilite: user.zoneResponsabilite,
      })

      // Construire l'adresse complète
      const addressParts: string[] = []
      if (user.address) addressParts.push(user.address)
      if (user.city) addressParts.push(user.city)
      if (user.postalCode) addressParts.push(user.postalCode)

      const fullAddress = addressParts.join(", ")
      console.log(`Full address for order ${order._id}: "${fullAddress}"`)

      if (fullAddress.trim()) {
        // Utiliser le service de géocodage amélioré
        const coords = await this.geocodingService.getCoordinatesWithFallback(fullAddress)
        console.log(`Geocoded coordinates for order ${order._id}:`, coords)
        return coords
      }

      // Si pas d'adresse, utiliser la zone de responsabilité
      if (user.zoneResponsabilite) {
        console.log(`Using zone responsabilite for order ${order._id}: ${user.zoneResponsabilite}`)
        return this.getRegionCoordinates(user.zoneResponsabilite)
      }

      // Fallback final sur Tunis
      console.log(`Using default Tunis coordinates for order ${order._id}`)
      return { lat: 36.8065, lng: 10.1815 }
    } catch (error) {
      console.error(`Error getting coordinates for order ${order._id}:`, error)
      return { lat: 36.8065, lng: 10.1815 }
    }
  }

  private getRegionCoordinates(region: TunisianRegion): Coordinates {
    const regionCoords = {
      [TunisianRegion.TUNIS]: { lat: 36.8065, lng: 10.1815 },
      [TunisianRegion.ARIANA]: { lat: 36.8625, lng: 10.1956 },
      [TunisianRegion.BEN_AROUS]: { lat: 36.7533, lng: 10.2282 },
      [TunisianRegion.MANOUBA]: { lat: 36.8081, lng: 10.0863 },
      [TunisianRegion.NABEUL]: { lat: 36.4513, lng: 10.7357 },
      [TunisianRegion.ZAGHOUAN]: { lat: 36.4103, lng: 10.1433 },
      [TunisianRegion.BIZERTE]: { lat: 37.2744, lng: 9.8739 },
      [TunisianRegion.BEJA]: { lat: 36.7256, lng: 9.1817 },
      [TunisianRegion.JENDOUBA]: { lat: 36.5011, lng: 8.7757 },
      [TunisianRegion.KEF]: { lat: 36.1675, lng: 8.7047 },
      [TunisianRegion.SILIANA]: { lat: 36.0844, lng: 9.3708 },
      [TunisianRegion.SOUSSE]: { lat: 35.8245, lng: 10.6346 },
      [TunisianRegion.MONASTIR]: { lat: 35.7643, lng: 10.8113 },
      [TunisianRegion.MAHDIA]: { lat: 35.5047, lng: 11.0622 },
      [TunisianRegion.SFAX]: { lat: 34.7478, lng: 10.7661 },
      [TunisianRegion.KAIROUAN]: { lat: 35.6781, lng: 10.0957 },
      [TunisianRegion.KASSERINE]: { lat: 35.1722, lng: 8.8304 },
      [TunisianRegion.SIDI_BOUZID]: { lat: 35.0382, lng: 9.4845 },
      [TunisianRegion.GABES]: { lat: 33.8814, lng: 10.0982 },
      [TunisianRegion.MEDENINE]: { lat: 33.3399, lng: 10.4917 },
      [TunisianRegion.TATAOUINE]: { lat: 32.9297, lng: 10.4518 },
      [TunisianRegion.GAFSA]: { lat: 34.4311, lng: 8.7757 },
      [TunisianRegion.TOZEUR]: { lat: 33.9197, lng: 8.1335 },
      [TunisianRegion.KEBILI]: { lat: 33.7072, lng: 8.9689 },
    }

    return regionCoords[region] || { lat: 36.8065, lng: 10.1815 }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}