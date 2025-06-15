import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { OrderService } from './order.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateOrderInput } from './dto/create-order.input';
import { CommonIncidentDescriptions, Order } from './entities/order.entity/order.entity';
import { Role } from '@/shared/enums/role.enum';
import { ReportIncidentInput } from './dto/report.incident.input';
import { OrderStatus } from '@/shared/order.status.enum';
import { isValidObjectId } from 'mongoose';
import { OrderStatusCount } from './entities/orderStatusCount.entity';
import { CoordinatesInput } from '@/course/entities/course.entity';

@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Mutation(() => Order)
  async createOrder(
    @Args('createOrderInput') createOrderInput: CreateOrderInput,
    @CurrentUser() user: any,
  ): Promise<Order> {
    console.log('Utilisateur connecté:', user);

    if (!user || ![Role.PARTNER, Role.ADMIN].includes(user.role)) {
      throw new ForbiddenException('Only PARTNER or ADMIN can create an order.');
    }

    return this.orderService.create(createOrderInput, user._id);
  }

 
  @Mutation(() => [Order])
  async assignOrdersToDriver(
    @Args('orderIds', { type: () => [String] }) orderIds: string[],
    @Args('driverId') driverId: string,
    @CurrentUser() user: any,
    ): Promise<Order[]> {
    const currentUserId = user._id;
  console.log("currentUser", currentUserId)
   
    const updatedOrders = await this.orderService.assignOrdersToDriver(orderIds, driverId, currentUserId);
  
    return updatedOrders;
  }



  @Mutation(() => Order)
  async updateOrderStatus(
    @Args('orderId') orderId: string,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
    @CurrentUser() user: any,
  ): Promise<Order> {
    return this.orderService.updateOrderStatus(orderId, status, user._id);
  }

  @Query(() => [Order], { name: 'orders' })
  async findAll(): Promise<Order[]> {
    return this.orderService.findAll();
  }

  @Query(() => Order, { name: 'order' })
  async findOne(@Args('id') id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Query(() => [OrderStatusCount]) 
  async countByPartner(@Args('id') partnerId: string) {
    return this.orderService.countOrdersByPartnerIdAndStatus(partnerId);
  }

  @Query(() => [Order])
  async getOrdersByPartnerId(
    @Args('partnerId') partnerId: string,
    @CurrentUser() user: any,
  ): Promise<Order[]> {
    if (user.role === Role.PARTNER && user._id !== partnerId) {
      throw new ForbiddenException('You can only access your own orders.');
    }
  
    if (![Role.ADMIN, Role.PARTNER].includes(user.role)) {
      throw new ForbiddenException('Unauthorized.');
    }
  
    return this.orderService.getOrdersByPartnerId(partnerId);
  }
  

  @Query(() => [Order])
  async getOrdersByClient(
    @Args('clientId') clientId: string,
    @CurrentUser() user: any,
  ): Promise<Order[]> {
   

    return this.orderService.getOrdersByClient(clientId);
  }


  @Mutation(() => Order)
  async removeOrder(@Args('id') id: string): Promise<Order> {
    return this.orderService.remove(id);
  }

  @Query(() => [Order], { name: 'ordersByStatus' })
  async findOrdersByStatus(
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
  ): Promise<Order[]> {
    return this.orderService.findByStatus(status);
  }

  @Mutation(() => Order)
  async reportIncident(
    @Args('input') input: ReportIncidentInput,
    @CurrentUser() user: any,
  ): Promise<Order> {
    if (!user || ![Role.ADMIN, Role.DRIVER].includes(user.role)) {
      throw new ForbiddenException('Only ADMIN or DRIVER can report an incident.');
    }

    return this.orderService.reportIncident(input, user._id);
  }

  
  @Mutation(() => Order)
  async recordDeliveryAttempt(
    @Args('orderId') orderId: string,
    @CurrentUser() user: any,
  ): Promise<Order> {
    if (!user || user.role !== Role.DRIVER) {
      throw new ForbiddenException('Only DRIVER can record a delivery attempt.');
    }

    return this.orderService.recordDeliveryAttempt(orderId,user._id);
  }

 
  @Mutation(() => Order)
  async reportVerificationIncident(
    @Args('orderId') orderId: string,
    @Args('incidentType', { type: () => CommonIncidentDescriptions }) incidentType: CommonIncidentDescriptions,
    @CurrentUser() user: any,
  ): Promise<Order> {
    if (!user || ![Role.ADMIN, Role.DRIVER].includes(user.role)) {
      throw new ForbiddenException('Only ADMIN or DRIVER can report a verification incident.');
    }

    return this.orderService.reportVerificationIncident(orderId, incidentType,user._id);
  }

  @Query(() => [Order])
  async getOrdersByIncident() {
    return await this.orderService.getAllOrdersWithIncidents();
  }

  @Query(() => [OrderStatusCount])
async getOrdersCountByStatus() {
  return this.orderService.getOrdersCountByStatus();
}


@Mutation(() => [Order])
  async assignOrdersToDriverOptimized(
    @Args('orderIds', { type: () => [String] }) orderIds: string[],
    @Args('driverId') driverId: string,
    @Args('pointDepart', { nullable: true }) pointDepart: CoordinatesInput,
    @CurrentUser() user: any,
  ): Promise<Order[]> {
    const currentUserId = user._id
    const validPointDepart = pointDepart?.lat !== undefined && pointDepart?.lng !== undefined
    ? { lat: pointDepart.lat, lng: pointDepart.lng }
    : undefined;
    const updatedOrders = await this.orderService.assignOrdersToDriverOptimized(
      orderIds,
      driverId,
      currentUserId,
      validPointDepart,
    )

    return updatedOrders
  }


@Query(() => [Order])
async getOrdersByResponsibilityZone(@CurrentUser() user: any): Promise<Order[]> {
  return this.orderService.getOrdersByResponsibilityZone(user._id);
}



}