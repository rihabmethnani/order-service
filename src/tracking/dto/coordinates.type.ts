// coordinates.schema.ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema } from '@nestjs/mongoose';

@ObjectType()
export class Coordinates {
  @Field(() => Number)
  lat?: number;

  @Field(() => Number)
  lng?: number;
}
