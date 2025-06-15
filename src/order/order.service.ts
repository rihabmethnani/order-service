import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CommonIncidentDescriptions, Order, OrderDocument } from './entities/order.entity/order.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UserCacheService } from '../RabbitMq/user-cache.service';
import { Role } from '../shared/enums/role.enum';
import { ReportIncidentInput } from './dto/report.incident.input';
import { HistoryService } from '../history/history.service'; 
import { RabbitMQService } from '@/RabbitMq/rabbitmq.service';
import { OrderStatus } from '@/shared/order.status.enum';
import { CourseService } from '@/course/course.service';
import { CreateCourseInput } from '@/course/dto/create.course.input';
import { CreateHistoryInput } from '@/history/dto/create-history.input';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly userCacheService: UserCacheService,
    private readonly historyService: HistoryService, 
    private readonly rabbitMQService: RabbitMQService, 
    private readonly courseService: CourseService

  ) {}

  async validateRole(userId: string, allowedRoles: Role[]): Promise<boolean> {
    const user = await this.userCacheService.getUserById(userId);

    if (!user) {
      console.error(` Utilisateur non trouvé dans le cache: ${userId}`);
      return false;
    }

    console.log(`✅ Utilisateur trouvé: ${JSON.stringify(user)}`);
    const userRole = user.role as Role;
    if (!allowedRoles.includes(userRole)) {
      console.error(
        ` Rôle incorrect pour l'utilisateur ${userId}: attendu [${allowedRoles.join(', ')}], mais trouvé ${user.role}`
      );
      return false;
    }

    console.log(`✅ Rôle valide pour l'utilisateur ${userId}: ${user.role}`);
    return true;
  }

  async create(createOrderInput: CreateOrderInput, userId: string): Promise<Order> {
    const isAllowed = await this.validateRole(userId, [Role.PARTNER, Role.ADMIN]);
    if (!isAllowed) {
        throw new ForbiddenException('Only PARTNER or ADMIN can create an order.');
    }

    try {
        const user = await this.userCacheService.getUserById(userId);
        if (!user) {
            throw new NotFoundException('User not found in cache');
        }

        const orderData = {
            ...createOrderInput,
            partnerId: user.role === Role.PARTNER ? userId : null,
            adminId: user.role === Role.ADMIN ? userId : null,
        };

        const order = new this.orderModel(orderData);
        const savedOrder = await order.save();

        // // Préparation des données d'historique selon le schéma CreateHistoryInput
        // const historyInput: CreateHistoryInput = {
        //     orderId: savedOrder._id.toString(),
        //     event: 'ORDER_CREATED',
        //     etatPrecedent: 'Nouvelle commande',
        // };

        // // Assignation de l'utilisateur selon son rôle
        // switch (user.role) {
        //     case Role.ADMIN:
        //         historyInput.adminId = userId;
        //         break;
        //     case Role.PARTNER:
        //         // Si PARTNER correspond à assistantAdmin dans votre schéma
        //         historyInput.partnerId = userId;
        //         break;
        //     // Ajouter d'autres rôles si nécessaire
        // }

        // await this.historyService.create(historyInput);

        return savedOrder;
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        throw new InternalServerErrorException('Failed to create order.');
    }
}
 

  // async assignOrdersToDriver(
  //   orderIds: string[], 
  //   driverId: string, 
  //   currentUserId: string
  // ): Promise<Order[]> {
  //   const isValidRole = await this.validateRole(currentUserId, [Role.ADMIN, Role.ADMIN_ASSISTANT]);
  //   if (!isValidRole) {
  //     throw new ForbiddenException('Only ADMIN or AdminAssistant can assign orders to drivers.');
  //   }
    
  //   if (!isValidObjectId(currentUserId)) {
  //     throw new BadRequestException('Invalid user ID');
  //   }
  
  //   const user = await this.userCacheService.getUserById(currentUserId);
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }
  
  //   const assignDate = new Date();
  // //nbr des ordres pour driver
  //   const ordersOnSameDate = await this.orderModel.find({
  //     driverId,
  //     dateAssignation: { 
  //       $gte: new Date(assignDate.setHours(0, 0, 0, 0)), 
  //       $lt: new Date(assignDate.setHours(23, 59, 59, 999)) 
  //     },
  //     status: { $in: [OrderStatus.RELANCE, OrderStatus.EN_COURS_LIVRAISON] }
  //   });
  
  //   if (ordersOnSameDate.length + orderIds.length > 10) {
  //     throw new ForbiddenException('Driver already has 10 or more orders with status RELANCE or EN_COURS_LIVRAISON for this date.');
  //   }
  
  //   const updatedOrders: Order[] = [];
  //   for (const orderId of orderIds) {
  //     const existingOrder = await this.orderModel.findById(orderId).exec();
  //     if (!existingOrder) {
  //       throw new NotFoundException(`Order with ID ${orderId} not found.`);
  //     }
  
  //     const updatedOrder = await this.orderModel.findByIdAndUpdate(
  //       orderId,
  //       { 
  //         driverId, 
  //         status: OrderStatus.ASSIGNE, 
  //         dateAssignation: assignDate 
  //       },
  //       { new: true }
  //     ).exec();
  
  //     updatedOrders.push(updatedOrder as Order);
  
  //     const historyInput: CreateHistoryInput = {
  //       orderId,
  //       event: 'ORDER_ASSIGNED',
  //       etatPrecedent: existingOrder.status,
  //       driverId, 
  //     };
  
  //     if (user.role === Role.ADMIN) {
  //       historyInput.adminId = currentUserId;
  //     } else if (user.role === Role.ADMIN_ASSISTANT) {
  //       historyInput.assisatnAdminId = currentUserId;
  //     }
  
  //     await this.historyService.create(historyInput);
  //   }
  
  //   const courseData: CreateCourseInput = {
  //     orderIds,
  //     driverId,
  //     status: OrderStatus.ASSIGNE,
  //     adminId: user.role === Role.ADMIN ? currentUserId : undefined,
  //     assistantId: user.role === Role.ADMIN_ASSISTANT ? currentUserId : undefined,
  //   };
  
  //   if (!courseData.orderIds || courseData.orderIds.length < 1 || courseData.orderIds.length > 10) {
  //     throw new BadRequestException('A course must have between 1 and 10 orders.');
  //   }
  
  //   await this.courseService.create(courseData);
  
  //   return updatedOrders;
  // }
  // Dans votre CourseService


/**
   * Assigne des ordres à un driver et crée/met à jour une course
   */
  async assignOrdersToDriver(orderIds: string[], driverId: string, currentUserId: string): Promise<Order[]> {
    const isValidRole = await this.validateRole(currentUserId, [Role.ADMIN, Role.ADMIN_ASSISTANT])
    if (!isValidRole) {
      throw new ForbiddenException("Only ADMIN or AdminAssistant can assign orders to drivers.")
    }

    const user = await this.userCacheService.getUserById(currentUserId)
    if (!user) {
      throw new NotFoundException("User not found")
    }

    const assignDate = new Date()
    const todayStart = new Date(assignDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(assignDate)
    todayEnd.setHours(23, 59, 59, 999)

    // 1. Récupérer les ordres déjà assignés directement
    const existingDirectOrders = await this.orderModel.find({
      driverId,
      dateAssignation: { $gte: todayStart, $lte: todayEnd },
      status: {
        $in: [OrderStatus.ATTRIBUE, OrderStatus.EN_LIVRAISON, OrderStatus.RELANCE],
      },
    })

    // 2. Récupérer les courses existantes avec leurs ordres
    const existingCourses = await this.courseService.findCoursesByDriverAndDate(driverId, todayStart, todayEnd)
    await Promise.all(existingCourses.map((c) => c.populate("orderIds")))

    const alreadyAssignedOrderIds = new Set<string>()
    existingDirectOrders.forEach((order) => alreadyAssignedOrderIds.add(order._id.toString()))
    existingCourses.forEach((course) => {
      if (Array.isArray(course.orderIds)) {
        course.orderIds.forEach((order: any) => {
          const id = order?._id?.toString() || order?.toString()
          if (id) alreadyAssignedOrderIds.add(id)
        })
      }
    })

    // 3. Vérification de doublon
    const duplicateOrders = orderIds.filter((id) => alreadyAssignedOrderIds.has(id))
    if (duplicateOrders.length > 0) {
      throw new ForbiddenException(
        `Les ordres suivants sont déjà assignés à ce livreur aujourd'hui : ${duplicateOrders.join(", ")}`,
      )
    }

    // 4. Vérifier la capacité
    const totalExisting = alreadyAssignedOrderIds.size
    if (totalExisting + orderIds.length > 10) {
      const remaining = 10 - totalExisting
      throw new ForbiddenException(
        `Driver already has ${totalExisting} orders assigned today. ` +
          `You can only assign up to ${remaining} more orders.`,
      )
    }

    // 5. Vérifier les ordres à assigner
    const ordersToAssign = await this.orderModel.find({ _id: { $in: orderIds } }).exec()
    if (ordersToAssign.length !== orderIds.length) {
      throw new NotFoundException("One or more orders not found")
    }

    // 6. Assigner les ordres
    const updatedOrders: Order[] = []
    for (const order of ordersToAssign) {
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          order._id,
          {
            driverId,
            status: OrderStatus.ATTRIBUE,
            dateAssignation: assignDate,
          },
          { new: true },
        )
        .exec()

      if (updatedOrder) {
        updatedOrders.push(updatedOrder)

        const historyInput: CreateHistoryInput = {
          orderId: order._id.toString(),
          event: "ORDER_ASSIGNED",
          etatPrecedent: order.status,
          driverId,
          ...(user.role === Role.ADMIN ? { adminId: currentUserId } : {}),
          ...(user.role === Role.ADMIN_ASSISTANT ? { assisatnAdminId: currentUserId } : {}),
        }

        await this.historyService.create(historyInput)
      }
    }

    // 7. Mise à jour ou création de la course
    if (updatedOrders.length > 0) {
      const existingCourse = existingCourses[0]

      if (existingCourse) {
        // Mettre à jour la course existante
        const existingOrderIds = Array.isArray(existingCourse.orderIds)
          ? existingCourse.orderIds.map((o: any) => o._id?.toString() || o.toString())
          : []

        const newOrderIds = [...new Set([...existingOrderIds, ...updatedOrders.map((o) => o._id.toString())])]

        await this.courseService.update(existingCourse._id, { orderIds: newOrderIds })
        console.log(`Updated existing course ${existingCourse._id} with ${newOrderIds.length} orders`)
      } else {
        // Créer une nouvelle course
        const courseData: CreateCourseInput = {
          orderIds: updatedOrders.map((o) => o._id.toString()),
          driverId,
          status: OrderStatus.ATTRIBUE,
          adminId: user.role === Role.ADMIN ? currentUserId : undefined,
          assistantId: user.role === Role.ADMIN_ASSISTANT ? currentUserId : undefined,
        }

        const newCourse = await this.courseService.create(courseData)
        console.log(`Created new course ${newCourse._id} with ${orderIds.length} orders`)
      }
    }

    return updatedOrders
  }
  
  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    userId: string
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }
  
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
  
    const user = await this.userCacheService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userRole = user.role;
  
    if ([OrderStatus.ATTRIBUE, OrderStatus.EN_LIVRAISON, OrderStatus.LIVRE].includes(status)) {
      const isAdmin = userRole === Role.ADMIN;
      if (!isAdmin && order.driverId !== userId) {
        throw new ForbiddenException('You are not authorized to update this order.');
      }
    }
      const oldStatus = order.status;
  
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(orderId, { status }, { new: true })
      .exec();
  
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }
  
    await this.rabbitMQService.publishEvent('PARCEL_STATUS_UPDATED', {
      userId,
      orderId,
      partnerId: order.partnerId,
      oldStatus,
      newStatus: updatedOrder.status,
      updatedByRole: userRole,
    });
  
    const historyInput: CreateHistoryInput = {
      orderId,
      event: 'ORDER_STATUS_CHANGED',
      etatPrecedent: oldStatus,
      ...(userRole === Role.ADMIN && { adminId: userId }),
      ...(userRole === Role.ADMIN_ASSISTANT && { assisatnAdminId: userId }),
      ...(userRole === Role.DRIVER && { driverId: userId }),
      ...(userRole === Role.PARTNER && { partnerId: userId }), 
    };
  
    await this.historyService.create(historyInput);
  
    return updatedOrder;
  }

  
  private async getUserRole(userId: string): Promise<string> {
    const user = await this.userCacheService.getUserById(userId);
    return user?.role || 'UNKNOWN';
  }

  //declarer  incident
 async reportIncident(input: ReportIncidentInput, userId: string): Promise<Order> {
    const { orderId, commonIncidentType, customIncidentDescription } = input;

    const existingOrder = await this.orderModel.findById(orderId).exec();
    if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    const user = await this.userCacheService.getUserById(userId);
    if (!user) {
        throw new NotFoundException('User not found');
    }

    const updateData: any = { 
        status: OrderStatus.EN_ATTENTE_RESOLUTION,
        incidentReportedAt: new Date()
    };

    if (commonIncidentType) {
        updateData.incidentDescription = commonIncidentType;
    } else if (customIncidentDescription) {
        updateData.customIncidentDescription = customIncidentDescription;
    } else {
        throw new BadRequestException('Either commonIncidentType or customIncidentDescription must be provided.');
    }

    const updatedOrder = await this.orderModel
        .findByIdAndUpdate(orderId, updateData, { new: true })
        .exec();

    if (!updatedOrder) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    const historyInput: CreateHistoryInput = {
        orderId,
        event: 'INCIDENT_REPORTED',
        etatPrecedent: existingOrder.status,
       
    };

    switch (user.role) {
        case Role.ADMIN:
            historyInput.adminId = userId;
            break;
        case Role.ADMIN_ASSISTANT:
            historyInput.assisatnAdminId = userId;
            break;
        case Role.DRIVER:
            historyInput.driverId = userId;
            break;
       
    }

    await this.historyService.create(historyInput);

    return updatedOrder;
}


async getAllOrdersWithIncidents(): Promise<Order[]> {
  try {
    const ordersWithIncidents = await this.orderModel.find({
      incidentDescription: { $exists: true, $ne: null }
    }).exec();

    return ordersWithIncidents;
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes avec incidents:', error);
    throw new InternalServerErrorException('Erreur lors de la récupération des incidents.');
  }
}


  async remove(id: string): Promise<Order> {
    const deletedOrder = await this.orderModel
      .findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })
      .exec();

    if (!deletedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    return deletedOrder;
  }

  async findByStatus(status: string): Promise<Order[]> {
    return this.orderModel.find({ status, deletedAt: null}).exec();
    }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find({ deletedAt: null }).exec();
    }
    
    async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!order) {
    throw new NotFoundException(`Order with ID ${id} not found.`);
    }
    return order;
    }

    async getOrdersByPartnerId(partnerId: string): Promise<Order[]> {
   
    
      return this.orderModel.find({ partnerId: partnerId, deletedAt: null }).exec();
    }

    async getOrdersByClient(clientId: string): Promise<Order[]> {
   
    
      return this.orderModel.find({ clientId: clientId, deletedAt: null }).exec();
    }

    // Enregistrer  tentative d'order
    async recordDeliveryAttempt(orderId: string, userId: string): Promise<Order> {
      const order = await this.orderModel.findById(orderId).exec();
      if (!order) {
          throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }
  
      const user = await this.userCacheService.getUserById(userId);
      if (!user) {
          throw new NotFoundException('User not found');
      }
  
      const previousStatus = order.status;
      const previousAttemptCount = order.attemptCount || 0;
  
      order.attemptCount = previousAttemptCount + 1;
  
      if (order.attemptCount === 1) {
          order.status = OrderStatus.RELANCE;
      } else if (order.attemptCount === 3) {
          order.status = OrderStatus.EN_VERIFICATION;
      }
  
      const updatedOrder = await order.save();
  
      const historyInput: CreateHistoryInput = {
          orderId,
          event: 'DELIVERY_ATTEMPT_RECORDED',
          etatPrecedent: previousStatus,
          driverId: userId, 
      };
  
      await this.historyService.create(historyInput);
  
      return updatedOrder;
  }
  
async findOrdersByPartnerId(partnerId: string): Promise<Order[]> {
  return this.orderModel.find({ partnerId }).exec();
}

 
   // Signaler un incident 
   
   async reportVerificationIncident(
    orderId: string, 
    incidentType: CommonIncidentDescriptions,
    userId: string
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }
  
    const user = await this.userCacheService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const previousStatus = order.status;
    const previousIncidentDescription = order.incidentDescription;
  
    order.status = OrderStatus.EN_VERIFICATION;
    order.incidentDescription = incidentType;
    order.createdAt = new Date();
  
    const updatedOrder = await order.save();
  
    const historyInput: CreateHistoryInput = {
      orderId,
      event: 'VERIFICATION_INCIDENT_REPORTED',
      etatPrecedent: previousStatus,
      
    };
  
    switch (user.role) {
      case Role.ADMIN:
        historyInput.adminId = userId;
        break;
      case Role.ADMIN_ASSISTANT:
        historyInput.assisatnAdminId = userId;
        break;
      case Role.DRIVER:
        historyInput.driverId = userId;
        break;
      case Role.PARTNER: 
        historyInput.partnerId = userId;
        break;
    }
  
    await this.historyService.create(historyInput);
  
    return updatedOrder;
  }

  async getOrdersCountByStatus(): Promise<{ status: string; count: number }[]> {
    try {
      const result = await this.orderModel.aggregate([
        { 
          $match: { 
            deletedAt: null // Exclure les commandes supprimées
          } 
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: "$_id",
            count: 1,
            _id: 0
          }
        },
        {
          $sort: { count: -1 } // Tri décroissant par nombre de commandes
        }
      ]).exec();
  
      // Si vous voulez inclure tous les statuts possibles même avec 0 commandes
      const allStatuses = Object.values(OrderStatus);
      const statusCounts = allStatuses.map(status => {
        const found = result.find(item => item.status === status);
        return {
          status,
          count: found ? found.count : 0
        };
      });
  
      return statusCounts;
    } catch (error) {
      console.error('Erreur lors du comptage des commandes par statut:', error);
      throw new InternalServerErrorException('Failed to get orders count by status');
    }
  }

  async countOrdersByPartnerIdAndStatus(partnerId: string): Promise<{ status: string; count: number }[]> {
    try {
      const results = await this.orderModel.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            deletedAt: null 
          } 
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: "$_id",
            count: 1,
            _id: 0
          }
        }
      ]).exec();
  
      return results;
    } catch (error) {
      console.error(`Error counting orders by status for partner ${partnerId}:`, error);
      throw new InternalServerErrorException('Failed to count orders by status');
    }
  }



  async assignOrdersToDriverOptimized(
    orderIds: string[],
    driverId: string,
    currentUserId: string,
    pointDepart?:
  {
    lat: number
    lng: number
  }
  ): Promise<Order[]>
  {
    // Vérification des rôles et validation comme dans votre méthode existante
    const isValidRole = await this.validateRole(currentUserId, [Role.ADMIN, Role.ADMIN_ASSISTANT])
    if (!isValidRole) {
      throw new ForbiddenException("Only ADMIN or AdminAssistant can assign orders to drivers.")
    }
  
    const user = await this.userCacheService.getUserById(currentUserId)
    if (!user) {
      throw new NotFoundException("User not found")
    }
  
    // Vérification des limites de commandes comme dans votre méthode existante
    const assignDate = new Date()
    const todayStart = new Date(assignDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(assignDate)
    todayEnd.setHours(23, 59, 59, 999)
  
    // Vérifier les commandes déjà assignées (comme dans votre méthode existante)
    const existingDirectOrders = await this.orderModel.find({
      driverId,
      dateAssignation: { $gte: todayStart, $lte: todayEnd },
      status: {
        $in: [OrderStatus.ATTRIBUE, OrderStatus.EN_LIVRAISON, OrderStatus.RELANCE],
      },
    })
  
    // Récupérer les courses existantes
    const existingCourses = await this.courseService.findCoursesByDriverAndDate(driverId, todayStart, todayEnd)
    await Promise.all(existingCourses.map((c) => c.populate("orderIds")))
  
    const alreadyAssignedOrderIds = new Set<string>()
    existingDirectOrders.forEach((order) => alreadyAssignedOrderIds.add(order._id.toString()))
    existingCourses.forEach((course) => {
      if (Array.isArray(course.orderIds)) {
        course.orderIds.forEach((order: any) => {
          const id = order?._id?.toString() || order?.toString()
          if (id) alreadyAssignedOrderIds.add(id)
        })
      }
    })
  
    // Vérification de doublon
    const duplicateOrders = orderIds.filter((id) => alreadyAssignedOrderIds.has(id))
    if (duplicateOrders.length > 0) {
      throw new ForbiddenException(
        `Les ordres suivants sont déjà assignés à ce livreur aujourd'hui : ${duplicateOrders.join(", ")}`,
      )
    }
  
    // Vérifier la capacité
    const totalExisting = alreadyAssignedOrderIds.size
    if (totalExisting + orderIds.length > 10) {
      const remaining = 10 - totalExisting
      throw new ForbiddenException(
        `Driver already has ${totalExisting} orders assigned today. ` +
          `You can only assign up to ${remaining} more orders.`,
      )
    }
  
    // Récupérer les commandes à assigner
    const ordersToAssign = await this.orderModel.find({ _id: { $in: orderIds } }).exec()
    if (ordersToAssign.length !== orderIds.length) {
      throw new NotFoundException("One or more orders not found")
    }
  
    // Assigner les commandes au chauffeur
    const updatedOrders: Order[] = []
    for (const order of ordersToAssign) {
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          order._id,
          {
            driverId,
            status: OrderStatus.ATTRIBUE,
            dateAssignation: assignDate,
          },
          { new: true },
        )
        .exec()
  
      if (updatedOrder) {
        updatedOrders.push(updatedOrder)
  
        // Créer l'historique
        const historyInput: CreateHistoryInput = {
          orderId: order._id.toString(),
          event: "ORDER_ASSIGNED",
          etatPrecedent: order.status,
          driverId,
          ...(user.role === Role.ADMIN ? { adminId: currentUserId } : {}),
          ...(user.role === Role.ADMIN_ASSISTANT ? { assisatnAdminId: currentUserId } : {}),
        }
  
        await this.historyService.create(historyInput)
      }
    }
  
    // Créer une course optimisée
    if (updatedOrders.length > 0) {
      const courseData: CreateCourseInput = {
        orderIds: updatedOrders.map((o) => o._id.toString()),
        driverId,
        status: OrderStatus.ATTRIBUE,
        adminId: user.role === Role.ADMIN ? currentUserId : undefined,
        assistantId: user.role === Role.ADMIN_ASSISTANT ? currentUserId : undefined,
        pointDepart: pointDepart,
      }
  
      await this.courseService.createOptimizedCourse(courseData)
    }
  
    return updatedOrders;
  }

async getOrdersByResponsibilityZone(userId: string): Promise<Order[]> {
  const user = await this.userCacheService.getUserById(userId);

  if (!user.zoneResponsabilite) {
    throw new ForbiddenException("L'utilisateur n'a pas de zones de responsabilité définies.");
  }

  const zones = Array.isArray(user.zoneResponsabilite)
    ? user.zoneResponsabilite
    : [user.zoneResponsabilite];

  const normalizedZones = zones.map((z: string) => z.trim().toLowerCase());

  return this.orderModel.find({
    region: { $in: normalizedZones.map((z) => new RegExp(`^${z}$`, 'i')) }, deletedAt: null
  }).exec();
}



}