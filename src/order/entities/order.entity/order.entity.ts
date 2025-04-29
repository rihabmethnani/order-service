// src/order/entities/order.entity.ts
import { OrderStatus } from '@/shared/order.status.enum';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';





export enum CommonIncidentDescriptions {
  COLIS_ENDOMMAGE = 'Colis endommagé',
  ADRESSE_INCORRECTE = 'Adresse incorrecte',
  CLIENT_INTROUVABLE = 'Client introuvable',
  COLIS_PERDU = 'Colis perdu',
  RETARD_METEO = 'Retard dû aux conditions météorologiques',
  RETARD_TRAFIC = 'Retard dû au trafic',
  COLIS_REFUSE = 'Colis refusé par le client',
  AUTRE = 'Autre',
}


registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Status of the order',
});

registerEnumType(CommonIncidentDescriptions, {
  name: 'CommonIncidentDescriptions',
  description: 'Incident descriptions of the order',
});


@ObjectType()
@Schema({ timestamps: true })
export class Order extends Document {
  @Field(() => ID)
  declare _id: string;

  @Field(() => OrderStatus)
  @Prop({ enum: OrderStatus, default: OrderStatus.EN_ATTENTE })
  status?: OrderStatus;

  @Field({ nullable: true })
  @Prop()
  partnerId?: string;

  @Field({ nullable: true })
  @Prop()
  adminId?: string;

  @Field()
  @Prop({ required: true })
  clientId?: string;

  @Field({ nullable: true })
  @Prop()
  driverId?: string;

  @Field()
  @Prop({ required: true })
  amount?: number;

  @Field()
  @Prop()
  description?: string;

  @Field()
  @Prop()
  comment?: string;

  @Field()
  @Prop()
  delayReason?: string;

  @Field(() => CommonIncidentDescriptions, { nullable: true })
  @Prop()
  incidentDescription?: CommonIncidentDescriptions;

  @Field(() => String, { nullable: true })
  @Prop()
  customIncidentDescription?: string;

  @Field()
  @Prop()
  fraisLivraison?: string;

  @Field(() => Number, { defaultValue: 0 })
  @Prop({ default: 0 })
  attemptCount?: number;

  @Field(() => Date)
  @Prop()
  createdAt?: Date;

  @Field(() => Date)
  @Prop()
  updatedAt?: Date;

  @Field(() => Date, { nullable: true, defaultValue: null })
  @Prop()
  deletedAt?: Date;
}
export type OrderDocument = Order & Document;

export const OrderSchema = SchemaFactory.createForClass(Order);