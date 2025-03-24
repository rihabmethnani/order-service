import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateHistoryInput {
  @Field(() => String)
  orderId?: string; // ID de la commande associée

  @Field(() => String)
  event?: string; // Description de l'événement

  @Field(() => String, { nullable: true })
  details?: string; // Détails supplémentaires (optionnel)
}