import { InputType, Field } from '@nestjs/graphql';
import { CommonIncidentDescriptions } from '../entities/order.entity/order.entity';

@InputType()
export class ReportIncidentInput {
  @Field(() => String)
  orderId?: string;

  @Field(() => CommonIncidentDescriptions, { nullable: true })
  commonIncidentType?: CommonIncidentDescriptions;

  @Field(() => String, { nullable: true })
  customIncidentDescription?: string;
}