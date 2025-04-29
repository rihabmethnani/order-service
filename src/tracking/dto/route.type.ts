// src/tracking/dto/route.type.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { GeoJSON } from './geojson.type';

@ObjectType()
export class Route {
  @Field(() => Number)
  distance!: number;

  @Field(() => Number)
  duration!: number;

  @Field(() => GeoJSON)
  geometry!: GeoJSON;
}

