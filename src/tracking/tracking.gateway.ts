import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import  { TrackingService } from "./tracking.service"
import type { DriverLocation } from "./entities/driver-location.entity"
import { forwardRef, Inject, Logger } from "@nestjs/common"

interface LocationUpdateMessage {
  driverId: string
  courseId?: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  status?: string
}

@WebSocketGateway({
  cors: {
    origin: "*", // Autoriser toutes les origines en développement
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
  },
  namespace: "/tracking",
  transports: ["websocket", "polling"], // Support des deux modes
  pingTimeout: 60000, // Augmenter le timeout à 60 secondes
  pingInterval: 25000, // Intervalle de ping plus court
  path: "/socket.io", // Chemin par défaut
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(TrackingGateway.name)
  private connectedClients = new Map<string, Socket>()
  private driverSockets = new Map<string, string>() // driverId -> socketId
  private adminSockets = new Set<string>() // socketIds des admins
  private driverLocations = new Map<string, DriverLocation>() 

  constructor( @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,) {}

   afterInit(server: Server) {
    this.logger.log("WebSocket Gateway initialized")

    // Configuration des middlewares
    server.use((socket, next) => {
      this.logger.log(`New connection attempt: ${socket.id} from ${socket.handshake.address}`)
      next()
    })
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} from ${client.handshake.address}`)
    this.connectedClients.set(client.id, client)

    // Envoyer une confirmation de connexion
    client.emit("connection:confirmed", {
      message: "Connected to tracking server",
      timestamp: new Date(),
      socketId: client.id,
    })
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    this.connectedClients.delete(client.id)

    // Nettoyer les maps
    for (const [driverId, socketId] of this.driverSockets.entries()) {
      if (socketId === client.id) {
        this.driverSockets.delete(driverId)
        this.logger.log(`Driver ${driverId} disconnected`)
        break
      }
    }
    this.adminSockets.delete(client.id)
  }

  /**
   * Un livreur s'identifie
   */
  @SubscribeMessage("driver:identify")
  handleDriverIdentify(client: Socket, data: { driverId: string }) {
    this.logger.log(`Driver ${data.driverId} identified with socket ${client.id}`)
    this.driverSockets.set(data.driverId, client.id)
    client.join(`driver:${data.driverId}`)

    // Confirmer l'identification
    client.emit("driver:identified", {
      driverId: data.driverId,
      timestamp: new Date(),
    })

    // Informer les admins qu'un nouveau driver est connecté
    this.server.to("admins").emit("driver:connected", {
      driverId: data.driverId,
      timestamp: new Date(),
    })
  }

  /**
   * Un admin s'identifie
   */
  @SubscribeMessage("admin:identify")
  handleAdminIdentify(client: Socket, data: { adminId: string }) {
    this.logger.log(`Admin ${data.adminId} identified with socket ${client.id}`)
    this.adminSockets.add(client.id)
    client.join("admins")

    // Confirmer l'identification
    client.emit("admin:identified", {
      adminId: data.adminId,
      timestamp: new Date(),
    })

    // Envoyer la liste des drivers actifs
    this.sendActiveDriversToAdmin(client)
  }

  /**
   * Envoie la liste des drivers actifs à un admin
   */
  private async sendActiveDriversToAdmin(client: Socket) {
    try {
      const activeDrivers = await this.trackingService.getAllActiveDriversLocations()
      client.emit("drivers:active_list", {
        drivers: activeDrivers,
        timestamp: new Date(),
      })
    } catch (error) {
      this.logger.error("Error sending active drivers list", error)
    }
  }

  /**
   * Mise à jour de position depuis le livreur
   */
  @SubscribeMessage("location:update")
  async handleLocationUpdate(client: Socket, data: LocationUpdateMessage) {
    try {
      this.logger.debug(`Received location update from ${data.driverId}`)

      // Sauvegarder la position
      const location = await this.trackingService.updateDriverLocation(data)

      // Mettre à jour le cache
      this.driverLocations.set(data.driverId, location)

      // Confirmer la réception au livreur
      client.emit("location:confirmed", {
        timestamp: location.timestamp,
        status: "success",
      })

      // Émettre la mise à jour
      this.emitLocationUpdate(location)
    } catch (error) {
      this.logger.error(`Error processing location update: ${(error as Error).message}`, (error as Error).stack)
      client.emit("location:error", {
        message: (error as Error).message,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Un admin demande à suivre un livreur
   */
  @SubscribeMessage("admin:track_driver")
  async handleTrackDriver(client: Socket, data: { driverId: string; courseId?: string }) {
    this.logger.log(`Admin ${client.id} started tracking driver ${data.driverId}`)

    // Rejoindre la room de tracking
    client.join(`track:${data.driverId}`)

    // Confirmer le début du tracking
    client.emit("tracking:started", {
      driverId: data.driverId,
      courseId: data.courseId,
      timestamp: new Date(),
    })

    // Vérifier si le driver est connecté
    const isDriverConnected = this.driverSockets.has(data.driverId)
    client.emit("driver:connection_status", {
      driverId: data.driverId,
      connected: isDriverConnected,
      timestamp: new Date(),
    })

    // Envoyer la dernière position connue
    await this.sendCurrentLocationToAdmin(client.id, data.driverId)
  }

  /**
   * Un admin arrête de suivre un livreur
   */
  @SubscribeMessage("admin:untrack_driver")
  handleUntrackDriver(client: Socket, data: { driverId: string }) {
    this.logger.log(`Admin ${client.id} stopped tracking driver ${data.driverId}`)
    client.leave(`track:${data.driverId}`)

    client.emit("tracking:stopped", {
      driverId: data.driverId,
      timestamp: new Date(),
    })
  }

  /**
   * Émet une mise à jour de position à tous les clients concernés
   */
  emitLocationUpdate(location: DriverLocation) {
    const locationData = {
      driverId: location.driverId,
      courseId: location.courseId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      status: location.status,
      timestamp: location.timestamp,
    }

    // Envoyer aux admins qui suivent ce livreur
    this.server.to(`track:${location.driverId}`).emit("driver:location_update", locationData)

    // Envoyer à tous les admins (pour la vue globale)
    this.server.to("admins").emit("driver:location_broadcast", {
      ...locationData,
      // Simplifier les données pour le broadcast
      accuracy: undefined,
      heading: undefined,
    })
  }

  /**
   * Envoie la position actuelle d'un livreur à un admin
   */
  private async sendCurrentLocationToAdmin(socketId: string, driverId: string) {
    try {
      // Vérifier d'abord le cache
      if (this.driverLocations.has(driverId)) {
        const cachedLocation = this.driverLocations.get(driverId)!
        this.server.to(socketId).emit("driver:current_location", {
          driverId: cachedLocation.driverId,
          courseId: cachedLocation.courseId,
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
          accuracy: cachedLocation.accuracy,
          speed: cachedLocation.speed,
          heading: cachedLocation.heading,
          status: cachedLocation.status,
          timestamp: cachedLocation.timestamp,
          source: "cache",
        })
        return
      }

      // Sinon, chercher dans la base de données
      const location = await this.trackingService.getDriverCurrentLocation(driverId)
      if (location) {
        this.server.to(socketId).emit("driver:current_location", {
          driverId: location.driverId,
          courseId: location.courseId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          status: location.status,
          timestamp: location.timestamp,
          source: "database",
        })

        // Mettre à jour le cache
        this.driverLocations.set(driverId, location)
      } else {
        this.server.to(socketId).emit("driver:no_location", {
          driverId,
          message: "Aucune position récente trouvée",
          timestamp: new Date(),
        })
      }
    } catch (error) {
      this.logger.error(`Error sending current location: ${(error as Error).message}`, (error as Error).stack)
      this.server.to(socketId).emit("driver:location_error", {
        driverId,
        error: (error as Error).message,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Endpoint de diagnostic pour vérifier l'état du serveur
   */
  @SubscribeMessage("server:status")
  handleServerStatus(client: Socket) {
    client.emit("server:status_response", {
      status: "online",
      connectedClients: this.connectedClients.size,
      connectedDrivers: this.driverSockets.size,
      connectedAdmins: this.adminSockets.size,
      timestamp: new Date(),
      uptime: process.uptime(),
    })
  }
}
