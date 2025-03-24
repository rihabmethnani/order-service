import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommonIncidentDescriptions, Order } from './entities/order.entity/order.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UserCacheService } from '../RabbitMq/user-cache.service';
import { Role } from '../shared/enums/role.enum';
import { ReportIncidentInput } from './dto/report.incident.input';
import { HistoryService } from '../history/history.service'; 

@Injectable()
export class OrderService {
  constructor(
    @InjectModel('Order') private orderModel: Model<Order>,
    private readonly userCacheService: UserCacheService,
    private readonly historyService: HistoryService, 
  ) {}

  async validateRole(userId: string, allowedRoles: Role[]): Promise<boolean> {
    const user = await this.userCacheService.getUserById(userId);

    if (!user) {
      console.error(`❌ Utilisateur non trouvé dans le cache: ${userId}`);
      return false;
    }

    console.log(`✅ Utilisateur trouvé: ${JSON.stringify(user)}`);

    if (!allowedRoles.includes(user.role)) {
      console.error(
        `❌ Rôle incorrect pour l'utilisateur ${userId}: attendu [${allowedRoles.join(', ')}], mais trouvé ${user.role}`
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

      // Ajouter un événement d'historique pour la création de la commande
      await this.historyService.create({
        orderId: savedOrder._id,
        event: 'Commande créée',
        details: `Commande créée par ${user.role.toLowerCase()}`,
      });

      return savedOrder;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la commande:', error);
      throw new InternalServerErrorException('Failed to create order.');
    }
  }

  async assignOrderToDriver(orderId: string, driverId: string, adminId: string): Promise<Order> {
    const isAdmin = await this.validateRole(adminId, [Role.ADMIN]);
    if (!isAdmin) {
      throw new ForbiddenException('Only ADMIN can assign orders to drivers.');
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        orderId,
        { driverId, status: 'ASSIGNED' },
        { new: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    // Ajouter un événement d'historique pour l'assignation du driver
    await this.historyService.create({
      orderId,
      event: 'Commande assignée à un driver',
      details: `Driver ID: ${driverId}`,
    });

    return updatedOrder;
  }

  async updateOrderStatus(orderId: string, status: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    if (status === 'ASSIGNED' || status === 'IN_TRANSIT' || status === 'DELIVERED') {
      const isAdmin = await this.validateRole(userId, [Role.ADMIN]);
      if (!isAdmin && order.driverId !== userId) {
        throw new ForbiddenException('You are not authorized to update this order.');
      }
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        orderId,
        { status },
        { new: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    // Ajouter un événement d'historique pour la mise à jour du statut
    await this.historyService.create({
      orderId,
      event: `Statut mis à jour : ${status}`,
    });

    return updatedOrder;
  }

  async reportIncident(input: ReportIncidentInput): Promise<Order> {
    const { orderId, commonIncidentType, customIncidentDescription } = input;

    const updateData: any = { status: 'ON_HOLD' };

    if (commonIncidentType) {
      updateData.commonIncidentType = commonIncidentType;
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

    // Ajouter un événement d'historique pour le signalement d'incident
    await this.historyService.create({
      orderId,
      event: 'Incident signalé',
      details: commonIncidentType
        ? `Type d'incident : ${commonIncidentType}`
        : `Description personnalisée : ${customIncidentDescription}`,
    });

    return updatedOrder;
  }

  async remove(id: string): Promise<Order> {
    const deletedOrder = await this.orderModel
      .findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })
      .exec();

    if (!deletedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    // Ajouter un événement d'historique pour la suppression logique
    await this.historyService.create({
      orderId: id,
      event: 'Commande supprimée',
    });

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
}