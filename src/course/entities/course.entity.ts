import { OrderStatus } from '@/shared/order.status.enum';
import { Coordinates } from '@/tracking/dto/coordinates.type';
import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@InputType()
export class CoordinatesInput {
  @Field(() => Number)
  lat!: number;

  @Field(() => Number)
  lng!: number;
}


@ObjectType()
@Schema({ timestamps: true })
export class Course extends Document {
  @Field(() => ID)
  declare _id: string;

  @Field(() => [String])
  @Prop({ type: [String], required: true })
  orderIds?: string[];

  @Field(() => String)
  @Prop({ type: String })
  driverId?: string;

  @Field({ nullable: true })
  @Prop()
  adminId?: string;

  @Field({ nullable: true })
  @Prop()
  assistantId?: string;

  @Field(() => OrderStatus)
  @Prop({ type: String, enum: OrderStatus, required: true })
  status?: OrderStatus;

   @Field(() => Coordinates, { nullable: true })
  @Prop({ type: { lat: Number, lng: Number }, required: false })
  pointDepart?: { lat: number; lng: number };

  @Field(() => [String])
  @Prop()
  pointArrivee?: string[];

  @Field(() => Number)
  @Prop()
  distance?: number;

  @Field(() => Number)
  @Prop()
  duree?: number;

  @Field(() => Date)
  @Prop()
  dateDepart?: Date;

  @Field(() => Date)
  @Prop()
  dateArrivee?: Date;

 @Field(() => [Coordinates], { nullable: true })
  @Prop({ type: [{ lat: Number, lng: Number }] })
  route?: { lat: number; lng: number }[]

  
  @Field(() => [Coordinates], { nullable: true })
  @Prop({ type: [{ lat: Number, lng: Number }] })
  detailedRoute?: { lat: number; lng: number }[]

  @Field(() => Date)
  createdAt?: Date;

  @Field(() => Date)
  updatedAt?: Date;
}

export type CourseDocument = Course & Document;

export const CourseSchema = SchemaFactory.createForClass(Course);
