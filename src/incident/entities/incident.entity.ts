import { CommonIncidentDescriptions, Order } from '@/order/entities/order.entity/order.entity';
import { User } from '@/RabbitMq/user-cache.service';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum IncidentStatus {
    OPEN= 'Open',
    IN_PROGRESS= 'In Progress',
    RESOLVED= 'Resolved',
    CANCELLED= 'Cancelled',
}

registerEnumType(IncidentStatus, {
  name: 'IncidentStatus',
  description: 'Incident status enum',
});

export enum IncidentPriority {
    LOW= "Low",
    MEDIUM= "Medium",
    HIGH= "High",
    CRITICAL= "Critical",
}

// Enums existants
export enum incidentType {
    DAMAGED_PACKAGE= "Damaged Package",
    INCORRECT_ADDRESS= "Incorrect Address",
    CUSTOMER_NOT_FOUND= "Customer Not Found",
    LOST_PACKAGE= "Lost Package",
    WEATHER_DELAY= "Weather Delay",
    TRAFFIC_DELAY= "Traffic Delay",
    REFUSED_PACKAGE= "Refused Package",
    OTHER= "Other",
}
registerEnumType(incidentType, {
    name: 'incidentType',
    description: 'Incident type enum',
  });

registerEnumType(IncidentPriority, {
  name: 'IncidentPriority',
  description: 'Incident priority enum',
});

@ObjectType()
@Schema({ timestamps: true })
export class Incident extends Document {
  @Field(() => ID)
  declare _id: string;

  @Field(() => Order)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  orderId?: Order | Types.ObjectId;

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

  @Field()
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
