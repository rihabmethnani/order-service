// src/tracking/dto/update-driver-location.input.ts
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateDriverLocationInput {
  @Field(() => String)
  driverId?: string;

  @Field(() => Number)
  latitude?: number;

  @Field(() => Number)
  longitude?: number;
}