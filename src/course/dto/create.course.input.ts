import { OrderStatus } from '@/shared/order.status.enum';
import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsNumber, IsDateString, IsArray, ArrayMaxSize, IsString } from 'class-validator';

@InputType()
export class CreateCourseInput {

    @Field(() => [String])
    @IsArray()
    @ArrayMaxSize(10, { message: 'You cannot assign more than 10 orders to a course.' })
    orderIds?: string[];
  
    @Field({nullable : true})
    driverId?: string;

    @Field({nullable : true})
    adminId?: string;
  
    @Field()
    assistantId?: string;

  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field()
  pointDepart?: string;

  @Field(() => [String])
  pointArrivee?: string[];

  @Field(() => Number)
  @IsNumber()
  distance?: number;

  @Field(() => Number)
  @IsNumber()
  duree?: number;

  @Field(() => Date)
  @IsDateString()
  dateDepart?: Date;

  @Field(() => Date)
  @IsDateString()
  dateArrivee?: Date;
}
