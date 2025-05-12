import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { IncidentPriority, incidentType } from '../entities/incident.entity';

@InputType()
export class CreateIncidentInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId?: string;

  @Field(() => incidentType, { nullable: true })
  @IsOptional()
  @IsString()
  incidentType?: incidentType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  images?: string[];

  @Field(() => IncidentPriority,{ nullable: true })
  @IsOptional()
  @IsString()
  priority?: IncidentPriority;
}
