import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { History } from './entities/history.entity';
import { HistoryService } from './history.service';
import { CreateHistoryInput } from './dto/create-history.input';

@Resolver(() => History)
export class HistoryResolver {
  constructor(private readonly historyService: HistoryService) {}

  // Mutation pour créer un nouvel événement d'historique
  @Mutation(() => History)
  async createHistory(@Args('input') input: CreateHistoryInput): Promise<History> {
    return this.historyService.create(input);
  }

  // Query pour récupérer l'historique d'une commande spécifique
  @Query(() => [History], { name: 'orderHistory' })
  async getOrderHistory(@Args('orderId') orderId: string): Promise<History[]> {
    return this.historyService.findByOrderId(orderId);
  }
}