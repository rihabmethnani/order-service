// src/tracking/dto/calculate-route.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CalculateRouteInput {
  @Field()
  destinationLatitude?: number;

  @Field()
  destinationLongitude?: number;
}
