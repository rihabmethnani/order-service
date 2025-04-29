import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateHistoryInput {
  @Field(() => String)
  orderId?: string; 

  
    @Field({nullable:true}) 
    adminId?: string;
  
    @Field({nullable:true}) 
    assisatnAdminId?: string;
  
    
    @Field({nullable:true}) 
    driverId?: string;

    @Field({nullable:true}) 
    partnerId?: string;

  @Field(() => String)
  event?: string;

  @Field(() => String, { nullable: true })
  etatPrecedent?: string; 
}