// src/order/dto/optimization-result.dto.ts
import { Coordinates } from '@/tracking/dto/coordinates.type';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OptimizationResultDto {
  @Field(() => [String])
  optimizedOrderIds!: string[];

  @Field(() => Float)
  distance!: number;

  @Field(() => Float)
  duration!: number;

  @Field(() => [Coordinates])
  route!: Coordinates[];

   detailedRoute!: Array<{ lat: number; lng: number }>
}
