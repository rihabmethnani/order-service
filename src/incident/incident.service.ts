import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Incident, IncidentPriority, IncidentStatus } from './entities/incident.entity';
import { OrderService } from '@/order/order.service';
import { UserCacheService } from '@/RabbitMq/user-cache.service';
import { HistoryService } from '@/history/history.service';
import { CreateHistoryInput } from '@/history/dto/create-history.input';
import { Role } from '@/shared/enums/role.enum';
import { OrderStatus } from '@/shared/order.status.enum';
import { CreateIncidentInput } from './dto/createIncident.input';
import { UpdateIncidentInput } from './dto/updateIncident.input';
import { IncidentTypeCount } from './entities/incident.stats.entity';



@Injectable()
export class IncidentService {
  constructor(
    @InjectModel(Incident.name) private incidentModel: Model<Incident>,
    private orderService: OrderService,
    private userCacheService: UserCacheService,
    private historyService: HistoryService,
  ) {}

  async createIncident(input: CreateIncidentInput, userId: string): Promise<Incident> {
    const { orderId, incidentType, customDescription, description, images, priority } = input;
    if (!orderId) {
        throw new BadRequestException('Order ID is required');
      }
    const order = await this.orderService.findOne(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    const user = await this.userCacheService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newIncident = new this.incidentModel({
      orderId,
      reportedBy: userId,
      incidentType,
      customDescription,
      description,
      images: images || [],
      priority,
    });

    const savedIncident = await newIncident.save();

    await this.orderService.updateOrderStatus(orderId, OrderStatus.PENDING_RESOLUTION, userId);

    const historyInput: CreateHistoryInput = {
      orderId,
      event: 'INCIDENT_REPORTED',
      etatPrecedent: order.status,
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

    return savedIncident;
  }

  async updateIncident(input: UpdateIncidentInput, userId: string): Promise<Incident> {
    const { incidentId, status, priority, comment, resolutionNotes } = input;
  
    const incident = await this.incidentModel.findById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found.`);
    }
  
    const updateData: any = {};
  
    if (status) {
      updateData.status = status;
  
      if (status === IncidentStatus.RESOLVED) {
        if (!incident.orderId) {
          throw new BadRequestException('OrderId is missing in the incident document');
        }
  
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
  
        await this.orderService.updateOrderStatus(
          incident.orderId.toString(),
          OrderStatus.DELIVERED,
          userId
        );
      }
    }
  
    if (priority) {
      updateData.priority = priority;
    }
  
    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
    }
  
    if (comment) {
      const commentObj = {
        comment,
        userId,
        createdAt: new Date(),
      };
  
      await this.incidentModel.updateOne(
        { _id: incidentId },
        { $push: { comments: commentObj } }
      );
    }
  
    const updatedIncident = await this.incidentModel.findByIdAndUpdate(
      incidentId,
      updateData,
      { new: true }
    );
  
    if (!updatedIncident) {
      throw new NotFoundException(`Incident with ID ${incidentId} could not be updated.`);
    }
  
    return updatedIncident;
  }
  

  async getIncidentsByOrderId(orderId: string): Promise<Incident[]> {
    return this.incidentModel.find({ orderId }).populate('reportedBy', 'name email').exec();
  }

  async getAllIncidents(filters?: {
    status?: IncidentStatus;
    priority?: IncidentPriority;
    incidentType?: IncidentTypeCount;
  }): Promise<Incident[]> {
    let query = {};
    
    if (filters) {
      if (filters.status) {
        query['status'] = filters.status;
      }
      if (filters.priority) {
        query['priority'] = filters.priority;
      }
      if (filters.incidentType) {
        query['incidentType'] = filters.incidentType;
      }
    }
    
    return this.incidentModel.find(query)
      .populate('orderId', 'orderNumber customerName deliveryAddress')
      .populate('reportedBy', 'name email role')
      .populate('resolvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .exec();
  }
  async getAll(): Promise<Incident[]> {
    return this.incidentModel.find()
      .populate('orderId', '_id clientId')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }
  async getIncidentById(incidentId: string): Promise<Incident> {
    const incident = await this.incidentModel.findById(incidentId)
      .populate('orderId', 'orderNumber customerName deliveryAddress status')
      .populate('reportedBy', 'name email role')
      .populate('resolvedBy', 'name email role')
      .exec();
      
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found.`);
    }
    
    return incident;
  }

  async getIncidentStats(): Promise<any> {
    const totalIncidents = await this.incidentModel.countDocuments();
    const openIncidents = await this.incidentModel.countDocuments({ status: IncidentStatus.OPEN });
    const inProgressIncidents = await this.incidentModel.countDocuments({ status: IncidentStatus.IN_PROGRESS });
    const resolvedIncidents = await this.incidentModel.countDocuments({ status: IncidentStatus.RESOLVED });
    
    const incidentsByType = await this.incidentModel.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return {
      totalIncidents,
      openIncidents,
      inProgressIncidents,
      resolvedIncidents,
      incidentsByType
    };
  }
}
