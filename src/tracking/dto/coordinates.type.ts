// src/tracking/dto/coordinates.type.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class Coordinates {
  @Field(() => Number)
  latitude?: number;

  @Field(() => Number)
  longitude?: number;
}