import { CommonIncidentDescriptions, Order } from '@/order/entities/order.entity/order.entity';
import { User } from '@/RabbitMq/user-cache.service';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum IncidentStatus {
  OPEN = "Ouvert",
  IN_PROGRESS = "En Cours",
  RESOLVED = "Résolu",
  CANCELLED = "Annulé",
}

registerEnumType(IncidentStatus, {
  name: "IncidentStatus",
  description: "Énumération des statuts d'incident",
})

export enum IncidentPriority {
  LOW = "Faible",
  MEDIUM = "Moyenne",
  HIGH = "Élevée",
  CRITICAL = "Critique",
}

registerEnumType(IncidentPriority, {
  name: "IncidentPriority",
  description: "Énumération des priorités d'incident",
})

export enum incidentType {
  DAMAGED_PACKAGE = "Colis Endommagé",
  INCORRECT_ADDRESS = "Adresse Incorrecte",
  CUSTOMER_NOT_FOUND = "Client Introuvable",
  LOST_PACKAGE = "Colis Perdu",
  WEATHER_DELAY = "Retard Météorologique",
  TRAFFIC_DELAY = "Retard de Circulation",
  REFUSED_PACKAGE = "Colis Refusé",
  OTHER = "Autre",
}

registerEnumType(incidentType, {
  name: "IncidentType",
  description: "Énumération des types d'incident",
})

@ObjectType()
@Schema({ timestamps: true })
export class Incident extends Document {
  @Field(() => ID)
  declare _id: string;

  @Field()
  @Prop()
  orderId?: string;

  @Field({ nullable: true })
  @Prop()
  partnerId?: string

  @Field()
  @Prop()
  reportedBy?:String

  @Field(() => incidentType)
    @Prop({ enum: incidentType })
    incidentType?: incidentType;
  

  @Field({ nullable: true })
  @Prop({ type: String, required: false })
  customDescription?: string;

  @Field()
  @Prop({ type: String, required: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  @Prop({ type: [String], default: [] })
  images?: string[];

  @Field(() => IncidentStatus, { nullable: true })
  @Prop({
    type: String,
    enum: Object.values(IncidentStatus),
    default: IncidentStatus.OPEN,
  })
  status?: IncidentStatus;

  @Field(() => IncidentPriority, { nullable: true })
  @Prop({
    type: String,
    enum: Object.values(IncidentPriority),
    default: IncidentPriority.MEDIUM,
  })
  priority?: IncidentPriority;




  @Field(() => [CommentInfo], { nullable: true })
  @Prop({
    type: [
      {
        comment: String,
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        createdAt: Date,
      },
    ],
    default: [],
  })
  comments?: { comment: string; userId: User | Types.ObjectId; createdAt: Date }[];

  @Field({ nullable: true })
  @Prop()
  resolvedBy?: String

  @Field({ nullable: true })
  @Prop({ type: Date, required: false })
  resolvedAt?: Date;

  @Field({ nullable: true })
  @Prop({ type: String, required: false })
  resolutionNotes?: string;

  @Field()
  createdAt?: Date;

  @Field()
  updatedAt?: Date;

    isOverdue(hoursThreshold = 24): boolean {
  if (!this.createdAt) {
    return false; // ou throw une erreur, selon ton cas
  }

  const now = new Date();
  const createdTime = this.createdAt.getTime();
  const hoursDiff = (now.getTime() - createdTime) / (1000 * 60 * 60);

  return (
    this.status !== IncidentStatus.RESOLVED &&
    this.status !== IncidentStatus.CANCELLED &&
    hoursDiff > hoursThreshold
  );
}
}

@ObjectType()
export class CommentInfo {
  @Field()
  comment?: string;

  @Field()
  userId?: String;

  @Field()
  createdAt?: Date;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);
