// src/tracking/entities/driver-location.entity.ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Route } from '../dto/route.type'; 

@ObjectType()
@Schema({ timestamps: true })
export class DriverLocation extends Document {
  @Field()
  @Prop({ required: true })
  driverId?: string;

  @Field()
  @Prop({ required: true, default: 0 })
  latitude?: number;

  @Field()
  @Prop({ required: true, default: 0 })
  longitude?: number;

  @Field()
  @Prop({ default: Date.now })
  timestamp?: Date;

  @Field(() => Route, { nullable: true }) 
  @Prop({ type: Object, default: null })  
  optimalRoute?: Route;
}

export const DriverLocationSchema = SchemaFactory.createForClass(DriverLocation);
