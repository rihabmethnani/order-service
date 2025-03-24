// src/order/dto/create-order.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { OrderStatus } from 'src/order/entities/order.entity/order.entity';

@InputType()
export class CreateOrderInput {
  @Field(() => OrderStatus, { defaultValue: OrderStatus.NEW })
  status?: OrderStatus;

  @Field()
  clientId?: string;

  @Field()
  amount?: number;

  @Field()
  description?: string;

  @Field()
  comment?: string;
}