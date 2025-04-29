import { Field, ObjectType, ID } from '@nestjs/graphql'; 
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@ObjectType() 
@Schema({ timestamps: true }) 
export class History extends Document {
  @Field(() => ID) 
  declare _id: string;

  @Field(() => String) 
  @Prop({ required: true, ref: 'Order' }) 
  orderId?: string;

  @Field({nullable:true}) 
  @Prop() 
  adminId?: string;

  @Field({nullable:true}) 
  @Prop() 
  assisatnAdminId?: string;

  
  @Field({nullable:true}) 
  @Prop() 
  driverId?: string;

  @Field({nullable:true}) 
  @Prop() 
  partnerId?: string;

  @Field(() => String) 
  @Prop({ required: true }) 
  event?: string;

  @Field(() => String, { nullable: true }) 
  @Prop() 
  etatPrecedent?: string;

  @Field(() => Date) 
  @Prop({ default: Date.now }) 
  timestamp?: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);