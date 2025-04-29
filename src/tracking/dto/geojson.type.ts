// src/tracking/dto/geojson.type.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class GeoJSON {
  @Field(() => String)
  type?: string; // Par exemple, "LineString"

  @Field(() => [[Number]]) // Tableau de coordonnées [longitude, latitude]
  coordinates?: number[][];
}