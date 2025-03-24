import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { OrderService } from './order.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { CreateOrderInput } from './dto/create-order.input';
import { Order } from './entities/order.entity/order.entity';
import { Role } from '@/shared/enums/role.enum';
import { ReportIncidentInput } from './dto/report.incident.input';

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

  @Mutation(() => Order)
  async assignOrderToDriver(
    @Args('orderId') orderId: string,
    @Args('driverId') driverId: string,
    @CurrentUser() user: any,
  ): Promise<Order> {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN can assign orders to drivers.');
    }

    return this.orderService.assignOrderToDriver(orderId, driverId, user._id);
  }

  @Mutation(() => Order)
  async updateOrderStatus(
    @Args('orderId') orderId: string,
    @Args('status') status: string,
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

  @Mutation(() => Order)
  async removeOrder(@Args('id') id: string): Promise<Order> {
    return this.orderService.remove(id);
  }

  @Query(() => [Order], { name: 'ordersByStatus' })
  async findOrdersByStatus(@Args('status') status: string): Promise<Order[]> {
    return this.orderService.findByStatus(status);
  }

  @Mutation(() => Order)
  async reportIncident(
    @Args('input') input: ReportIncidentInput,
    @CurrentUser() user: any,
  ): Promise<Order> {
    // Vérifier les autorisations
    if (!user || ![Role.ADMIN, Role.DRIVER].includes(user.role)) {
      throw new ForbiddenException('Only ADMIN or DRIVER can report an incident.');
    }

    // Appeler le service pour signaler l'incident
    return this.orderService.reportIncident(input);
  }
}