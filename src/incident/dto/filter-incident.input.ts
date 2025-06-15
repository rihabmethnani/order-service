import { Field, InputType } from "@nestjs/graphql"
import { IsEnum, IsOptional, IsString, IsDateString, IsMongoId } from "class-validator"
import { IncidentPriority, IncidentStatus, incidentType } from "../entities/incident.entity"

@InputType()
export class FilterIncidentInput {
  @Field(() => IncidentStatus, { nullable: true })
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus

  @Field(() => IncidentPriority, { nullable: true })
  @IsEnum(IncidentPriority)
  @IsOptional()
  priority?: IncidentPriority

  @Field(() => incidentType, { nullable: true })
  @IsEnum(incidentType)
  @IsOptional()
  incidentType?: incidentType

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  reportedBy?: string

  @Field(() => String, { nullable: true })
  @IsMongoId()
  @IsOptional()
  orderId?: string

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  createdAfter?: string

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  createdBefore?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  searchTerm?: string
}
