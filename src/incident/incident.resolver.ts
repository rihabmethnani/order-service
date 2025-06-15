import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { IncidentService } from './incident.service';
import { Incident } from './entities/incident.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateIncidentInput } from './dto/createIncident.input';
import { UpdateIncidentInput } from './dto/updateIncident.input';
import { FilterIncidentInput } from './dto/filter-incident.input';
import { IncidentStatsType } from './entities/incident.stats.entity';


@Resolver(() => Incident)
export class IncidentResolver {
  constructor(private readonly incidentService: IncidentService) {}

  @Mutation(() => Incident)
  async createIncident(
    @Args('input') input: CreateIncidentInput,
    @CurrentUser() user: any,
  ): Promise<Incident> {
    console.log('User from context:', user);

    return this.incidentService.createIncident(input, user._id);
  }

  @Mutation(() => Incident)
  async updateIncident(
    @Args('input') input: UpdateIncidentInput,
    @CurrentUser() user: any,
  ): Promise<Incident> {
    return this.incidentService.updateIncident(input, user._id);
  }

  @Query(() => [Incident])
  async getIncidentsByOrderId(
    @Args('orderId') orderId: string,
  ): Promise<Incident[]> {
    return this.incidentService.getIncidentsByOrderId(orderId);
  }
@Query(() => [Incident])
async getAllIncidents(
  @Args('filters', { type: () => FilterIncidentInput, nullable: true }) filters?: FilterIncidentInput,
): Promise<Incident[]> {
  return this.incidentService.getAllIncidents(filters);
}

  @Query(() => [Incident])
    async getAll() {
    return this.incidentService.getAll();
  }

  @Query(() => Incident)
  async getIncidentById(
    @Args('incidentId') incidentId: string,
  ): Promise<Incident> {
    return this.incidentService.getIncidentById(incidentId);
  }

  @Query(() => IncidentStatsType)
  async getIncidentStats(): Promise<any> {
    return this.incidentService.getIncidentStats();
  }

  @Query(() => IncidentStatsType)
  async getIncidentStatsByPartnerId(
     @CurrentUser() user: any,
  ): Promise<any> {
    return this.incidentService.getIncidentStatsByPartnerId(user._id);
  }

@Query(() => [Incident])
async getIncidentsByPartnerId(
  @CurrentUser() user: any,
): Promise<Incident[]> {
  return this.incidentService.getIncidentsByPartnerId(user._id);
}


}
