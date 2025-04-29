import { OrderStatus } from '@/shared/order.status.enum';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Field()
  @Prop()
  pointDepart?: string;

  @Field()
  @Prop()
  pointArrivee?: string;

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

  @Field(() => Date)
  createdAt?: Date;

  @Field(() => Date)
  updatedAt?: Date;
}

export type CourseDocument = Course & Document;

export const CourseSchema = SchemaFactory.createForClass(Course);
