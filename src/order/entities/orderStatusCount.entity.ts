import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OrderStatusCount {
  @Field(() => String, { nullable: true })
  status?: string;

  @Field({ nullable: true })
  count?: number;
}