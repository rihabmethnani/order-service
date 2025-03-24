// src/order/entities/order.entity.ts
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OrderStatus {
  NEW = 'NEW', // Le colis vient d'être créé par le partenaire.
  PENDING = 'PENDING', // En attente d'être pris en charge par un driver.
  ASSIGNED = 'ASSIGNED', // Assigné à un driver.
  IN_TRANSIT = 'IN_TRANSIT', // En cours de livraison.
  DELIVERED = 'DELIVERED', // Livré avec succès.
  FAILED_ATTEMPT = 'FAILED_ATTEMPT', // Tentative de livraison échouée (client introuvable, adresse incorrecte, etc.).
  RETURNED = 'RETURNED', // Retourné au partenaire (si non livrable).
  CANCELLED = 'CANCELLED', // Annulé par le client ou le partenaire.
  ON_HOLD = 'ON_HOLD', // En attente de résolution d'un problème (exemple : colis endommagé).
  RELAUNCHED = 'RELAUNCHED', // Relancé après une tentative échouée.
  DELAYED = 'DELAYED', // Livraison retardée (en raison de conditions météorologiques ou autres).
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', // Une partie du colis a été livrée (pour les commandes volumineuses).
  IN_STORAGE = 'IN_STORAGE', // Le colis est temporairement stocké dans un entrepôt intermédiaire.
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION', // En attente de confirmation du client après une tentative de livraison.
}

export enum CommonIncidentDescriptions {
  DAMAGED_PACKAGE = 'Colis endommagé',
  WRONG_ADDRESS = 'Adresse incorrecte',
  CLIENT_UNAVAILABLE = 'Client introuvable',
  LOST_PACKAGE = 'Colis perdu',
  DELAY_DUE_TO_WEATHER = 'Retard dû aux conditions météorologiques',
  DELAY_DUE_TO_TRAFFIC = 'Retard dû au trafic',
  PACKAGE_REFUSED = 'Colis refusé par le client',
  OTHER = 'Autre',
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
  @Prop({ enum: OrderStatus, default: OrderStatus.NEW })
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

  @Field()
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

export const OrderSchema = SchemaFactory.createForClass(Order);