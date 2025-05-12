// src/incidents/dto/filter-incident.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { IncidentPriority, incidentType } from '../entities/incident.entity';

@InputType()
export class FilterIncidentInput {
  @Field({ nullable: true })
  status?: string;

  @Field(() => IncidentPriority, { nullable: true })
    
    priority?: IncidentPriority;


  @Field(() => incidentType, { nullable: true })
  incidentType?: incidentType;
}
