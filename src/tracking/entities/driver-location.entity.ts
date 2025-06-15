import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import type { Document } from "mongoose"
import { Field, ObjectType, ID, Float } from "@nestjs/graphql"

@ObjectType()
@Schema({ timestamps: true })
export class DriverLocation {
   @Field(() => ID) 
    declare _id: string;

  @Field(() => String)
  @Prop({ required: true, index: true })
  driverId?: string

  @Field(() => String, { nullable: true })
  @Prop({ index: true })
  courseId?: string

  @Field(() => Float)
  @Prop({ required: true })
  latitude?: number

  @Field(() => Float)
  @Prop({ required: true })
  longitude?: number

  @Field(() => Float, { nullable: true })
  @Prop()
  accuracy?: number

  @Field(() => Float, { nullable: true })
  @Prop()
  speed?: number

  @Field(() => Float, { nullable: true })
  @Prop()
  heading?: number

  @Field(() => String, { nullable: true })
  @Prop()
  status?: string // 'active', 'inactive', 'delivering'

  @Field(() => Date)
  @Prop({ default: Date.now, index: true })
  timestamp?: Date

  @Field(() => Date)
  createdAt?: Date

  @Field(() => Date)
  updatedAt?: Date
}

export type DriverLocationDocument = DriverLocation & Document
export const DriverLocationSchema = SchemaFactory.createForClass(DriverLocation)

// Index pour optimiser les requêtes
DriverLocationSchema.index({ driverId: 1, timestamp: -1 })
DriverLocationSchema.index({ courseId: 1, timestamp: -1 })
DriverLocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 }) // Expire après 24h
