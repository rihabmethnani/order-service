import { ObjectType, Field, Int } from "@nestjs/graphql"

@ObjectType()
export class IncidentTypeCount {
  @Field()
  declare _id: string

  @Field(() => Int)
  count?: number
}

@ObjectType()
export class IncidentStatsType {
  @Field(() => Int)
  totalIncidents?: number

  @Field(() => Int)
  openIncidents?: number

  @Field(() => Int)
  inProgressIncidents?: number

  @Field(() => Int)
  resolvedIncidents?: number

  @Field(() => [IncidentTypeCount])
  incidentsByType?: IncidentTypeCount[]

  @Field(() => Int, { nullable: true })
  averageResolutionTime?: number

  @Field(() => Int, { nullable: true })
  overdueIncidents?: number
}
