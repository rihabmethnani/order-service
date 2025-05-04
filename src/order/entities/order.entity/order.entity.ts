// src/order/entities/order.entity.ts
import { OrderStatus } from '@/shared/order.status.enum';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// 1. Enum des régions tunisiennes
export enum TunisianRegion {
  ARIANA = 'Ariana',
  BEJA = 'Béja',
  BEN_AROUS = 'Ben Arous',
  BIZERTE = 'Bizerte',
  GABES = 'Gabès',
  GAFSA = 'Gafsa',
  JENDOUBA = 'Jendouba',
  KAIROUAN = 'Kairouan',
  KASSERINE = 'Kasserine',
  KEBILI = 'Kébili',
  KEF = 'Le Kef',
  MAHDIA = 'Mahdia',
  MANOUBA = 'La Manouba',
  MEDENINE = 'Médenine',
  MONASTIR = 'Monastir',
  NABEUL = 'Nabeul',
  SFAX = 'Sfax',
  SIDI_BOUZID = 'Sidi Bouzid',
  SILIANA = 'Siliana',
  SOUSSE = 'Sousse',
  TATAOUINE = 'Tataouine',
  TOZEUR = 'Tozeur',
  TUNIS = 'Tunis',
  ZAGHOUAN = 'Zaghouan',
}

// Enums existants
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

// Enregistrement des enums pour GraphQL
registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Status of the order',
});

registerEnumType(CommonIncidentDescriptions, {
  name: 'CommonIncidentDescriptions',
  description: 'Incident descriptions of the order',
});

registerEnumType(TunisianRegion, {
  name: 'TunisianRegion',
  description: 'Les 24 régions de la Tunisie',
});

// Classe Order
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

  @Field(() => TunisianRegion, { nullable: true })
  @Prop({ enum: TunisianRegion })
  region?: TunisianRegion;

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
