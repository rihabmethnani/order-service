import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { IncidentPriority, IncidentStatus } from '../entities/incident.entity';

@InputType()
export class UpdateIncidentInput {
  @Field()
  @IsString()
  incidentId?: string;

  @Field(() => IncidentStatus, { nullable: true })
  @IsOptional()
  status?: IncidentStatus;

  @Field(() => IncidentPriority, { nullable: true })
  @IsOptional()
  @IsString()
  priority?: IncidentPriority;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
