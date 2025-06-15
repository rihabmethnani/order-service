import { Field, InputType, ID } from "@nestjs/graphql"
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsMongoId } from "class-validator"
import { IncidentStatus, IncidentPriority } from "../entities/incident.entity"

@InputType()
export class UpdateIncidentInput {
  @Field(() => ID)
  @IsMongoId()
  @IsNotEmpty()
  incidentId?: string

  @Field(() => IncidentStatus, { nullable: true })
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus

  @Field(() => IncidentPriority, { nullable: true })
  @IsEnum(IncidentPriority)
  @IsOptional()
  priority?: IncidentPriority

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  images?: string[]

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  comment?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  resolutionNotes?: string
}
