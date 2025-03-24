// src/order/dto/update-order.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateOrderInput {
  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  clientId?: string;

  @Field({ nullable: true })
  driverId?: string;

  @Field({ nullable: true })
  amount?: number;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  comment?: string;
}