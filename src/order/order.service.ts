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
  // async assignOrderToDriver(orderId: string, driverId: string, adminId: string): Promise<Order> {
  //   const isAdmin = await this.validateRole(adminId, [Role.ADMIN]);
  //   if (!isAdmin) {
  //     throw new ForbiddenException('Only ADMIN can assign orders to drivers.');
  //   }
  
  //   const updatedOrder = await this.orderModel
  //     .findByIdAndUpdate(
  //       orderId,
  //       { driverId, status: OrderStatus.ASSIGNE }, // Utilisez le statut ASSIGNE
  //       { new: true },
  //     )
  //     .exec();
  
  //   if (!updatedOrder) {
  //     throw new NotFoundException(`Order with ID ${orderId} not found.`);
  //   }
  
  //   // Ajouter un événement d'historique pour l'assignation du driver
  //   await this.historyService.create({
  //     orderId,
  //     event: 'Commande assignée à un driver',
  //     details: `Driver ID: ${driverId}`,
  //   });
  
  //   return updatedOrder;
  // }

  async assignOrdersToDriver(
    orderIds: string[], 
    driverId: string, 
    currentUserId: string
  ): Promise<Order[]> {
    const isValidRole = await this.validateRole(currentUserId, [Role.ADMIN, Role.ADMIN_ASSISTANT]);
    if (!isValidRole) {
      throw new ForbiddenException('Only ADMIN or AdminAssistant can assign orders to drivers.');
    }
    
    if (!isValidObjectId(currentUserId)) {
      throw new BadRequestException('Invalid user ID');
    }
  
    const user = await this.userCacheService.getUserById(currentUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const assignDate = new Date();
  //nbr des ordres pour driver
    const ordersOnSameDate = await this.orderModel.find({
      driverId,
      dateAssignation: { 
        $gte: new Date(assignDate.setHours(0, 0, 0, 0)), 
        $lt: new Date(assignDate.setHours(23, 59, 59, 999)) 
      },
      status: { $in: [OrderStatus.RELANCE, OrderStatus.EN_COURS_LIVRAISON] }
    });
  
    if (ordersOnSameDate.length + orderIds.length > 10) {
      throw new ForbiddenException('Driver already has 10 or more orders with status RELANCE or EN_COURS_LIVRAISON for this date.');
    }
  
    const updatedOrders: Order[] = [];
    for (const orderId of orderIds) {
      const existingOrder = await this.orderModel.findById(orderId).exec();
      if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }
  
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        orderId,
        { 
          driverId, 
          status: OrderStatus.ASSIGNE, 
          dateAssignation: assignDate 
        },
        { new: true }
      ).exec();
  
      updatedOrders.push(updatedOrder as Order);
  
      const historyInput: CreateHistoryInput = {
        orderId,
        event: 'ORDER_ASSIGNED',
        etatPrecedent: existingOrder.status,
        driverId, 
      };
  
      if (user.role === Role.ADMIN) {
        historyInput.adminId = currentUserId;
      } else if (user.role === Role.ADMIN_ASSISTANT) {
        historyInput.assisatnAdminId = currentUserId;
      }
  
      await this.historyService.create(historyInput);
    }
  
    const courseData: CreateCourseInput = {
      orderIds,
      driverId,
      status: OrderStatus.ASSIGNE,
      adminId: user.role === Role.ADMIN ? currentUserId : undefined,
      assistantId: user.role === Role.ADMIN_ASSISTANT ? currentUserId : undefined,
    };
  
    if (!courseData.orderIds || courseData.orderIds.length < 1 || courseData.orderIds.length > 10) {
      throw new BadRequestException('A course must have between 1 and 10 orders.');
    }
  
    await this.courseService.create(courseData);
  
    return updatedOrders;
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
  
    if ([OrderStatus.ASSIGNE, OrderStatus.EN_COURS_LIVRAISON, OrderStatus.LIVRE].includes(status)) {
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
          order.status = OrderStatus.VERIFICATION;
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
  
    order.status = OrderStatus.VERIFICATION;
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
}