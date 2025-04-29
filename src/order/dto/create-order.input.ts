// src/order/dto/create-order.input.ts
import { OrderStatus } from '@/shared/order.status.enum';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateOrderInput {
  @Field(() => OrderStatus, { defaultValue: OrderStatus.EN_ATTENTE })
  status?: OrderStatus;

  @Field()
  clientId?: string;

  @Field()
  amount?: number;

  @Field()
  description?: string;

  @Field()
  comment?: string;

  @Field()
  fraisLivraison?:string;
}