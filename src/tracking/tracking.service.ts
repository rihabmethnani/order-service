import { forwardRef, Inject, Injectable } from "@nestjs/common"
import type { Model } from "mongoose"
import { DriverLocation, DriverLocationDocument } from "./entities/driver-location.entity"
import { TrackingGateway } from "./tracking.gateway"
import { InjectModel } from "@nestjs/mongoose"

export interface LocationUpdate {
  driverId: string
  courseId?: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  status?: string
}

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(DriverLocation.name)
    private readonly driverLocationModel: Model<DriverLocationDocument>,
  @Inject(forwardRef(() => TrackingGateway))
    private readonly trackingGateway: TrackingGateway,  ) {}

  /**
   * Met à jour la position d'un livreur
   */
  async updateDriverLocation(locationData: LocationUpdate): Promise<DriverLocation> {
    console.log(`Updating location for driver ${locationData.driverId}:`, locationData)

    // Créer une nouvelle entrée de localisation
    const location = new this.driverLocationModel({
      ...locationData,
      timestamp: new Date(),
    })

    const savedLocation = await location.save()

    // Émettre la mise à jour en temps réel via WebSocket
    this.trackingGateway.emitLocationUpdate(savedLocation)

    // Nettoyer les anciennes positions (garder seulement les 100 dernières par driver)
    await this.cleanupOldLocations(locationData.driverId)

    console.log(`Location updated for driver ${locationData.driverId}`)
    return savedLocation
  }

  /**
   * Récupère la dernière position d'un livreur
   */
  async getDriverCurrentLocation(driverId: string): Promise<DriverLocation | null> {
    const location = await this.driverLocationModel.findOne({ driverId }).sort({ timestamp: -1 }).limit(1).exec()

    return location
  }

  /**
   * Récupère la dernière position d'un livreur pour une course spécifique
   */
  async getDriverLocationForCourse(driverId: string, courseId: string): Promise<DriverLocation | null> {
    const location = await this.driverLocationModel
      .findOne({ driverId, courseId })
      .sort({ timestamp: -1 })
      .limit(1)
      .exec()

    return location
  }

  /**
   * Récupère l'historique des positions d'un livreur
   */
  async getDriverLocationHistory(
    driverId: string,
    startTime?: Date,
    endTime?: Date,
    limit = 100,
  ): Promise<DriverLocation[]> {
    const query: any = { driverId }

    if (startTime || endTime) {
      query.timestamp = {}
      if (startTime) query.timestamp.$gte = startTime
      if (endTime) query.timestamp.$lte = endTime
    }

    return this.driverLocationModel.find(query).sort({ timestamp: -1 }).limit(limit).exec()
  }

  /**
   * Récupère les positions de tous les livreurs actifs
   */
  async getAllActiveDriversLocations(): Promise<DriverLocation[]> {
    // Considérer un livreur comme actif s'il a envoyé sa position dans les 5 dernières minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    // Utiliser l'agrégation pour récupérer la dernière position de chaque livreur
    const locations = await this.driverLocationModel.aggregate([
      {
        $match: {
          timestamp: { $gte: fiveMinutesAgo },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$driverId",
          latestLocation: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestLocation" },
      },
    ])

    return locations
  }

  /**
   * Met à jour le statut d'un livreur
   */
  async updateDriverStatus(driverId: string, status: string, courseId?: string): Promise<void> {
    const currentLocation = await this.getDriverCurrentLocation(driverId)

    if (currentLocation) {
      await this.updateDriverLocation({
        driverId,
        courseId: courseId || currentLocation.courseId,
        latitude: currentLocation.latitude ?? 0,
        longitude: currentLocation.longitude ?? 0,
        accuracy: currentLocation.accuracy,
        speed: currentLocation.speed,
        heading: currentLocation.heading,
        status,
      })
    }
  }

  /**
   * Démarre le tracking pour une course
   */
  async startCourseTracking(driverId: string, courseId: string): Promise<void> {
    console.log(`Starting course tracking for driver ${driverId}, course ${courseId}`)
    await this.updateDriverStatus(driverId, "delivering", courseId)
  }

  /**
   * Arrête le tracking pour une course
   */
  async stopCourseTracking(driverId: string): Promise<void> {
    console.log(`Stopping course tracking for driver ${driverId}`)
    await this.updateDriverStatus(driverId, "inactive")
  }

  /**
   * Nettoie les anciennes positions pour éviter l'accumulation
   */
  private async cleanupOldLocations(driverId: string): Promise<void> {
    const locations = await this.driverLocationModel
      .find({ driverId })
      .sort({ timestamp: -1 })
      .skip(100) // Garder les 100 dernières
      .select("_id")
      .exec()

    if (locations.length > 0) {
      const idsToDelete = locations.map((loc) => loc._id)
      await this.driverLocationModel.deleteMany({ _id: { $in: idsToDelete } })
      console.log(`Cleaned up ${idsToDelete.length} old locations for driver ${driverId}`)
    }
  }

  /**
   * Calcule la distance parcourue par un livreur
   */
  async calculateDistanceTraveled(driverId: string, startTime: Date, endTime: Date): Promise<number> {
    const locations = await this.getDriverLocationHistory(driverId, startTime, endTime, 1000)

    if (locations.length < 2) return 0

    let totalDistance = 0
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i]
      const curr = locations[i - 1]

      const distance = this.calculateHaversineDistance(
        { lat: prev.latitude ?? 0, lng: prev.longitude ?? 0 },
        { lat: curr.latitude ?? 0, lng: curr.longitude ?? 0 },
      )

      totalDistance += distance
    }

    return totalDistance
  }

  /**
   * Calcule la distance entre deux points
   */
  private calculateHaversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371000 // Rayon de la Terre en mètres
    const φ1 = (point1.lat * Math.PI) / 180
    const φ2 = (point2.lat * Math.PI) / 180
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }
}
