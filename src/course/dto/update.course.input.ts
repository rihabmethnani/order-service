import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { CreateCourseInput } from './create.course.input';
import { OrderStatus } from '@/shared/order.status.enum';
import { CoordinatesInput } from '../entities/course.entity';

@InputType()
export class UpdateCourseInput extends PartialType(CreateCourseInput) {
 @Field(() => CoordinatesInput, { nullable: true })
  @IsOptional()
  pointDepart?: CoordinatesInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  pointArrivee?: string[];

  @Field(() => Number, { nullable: true })
  @IsOptional()
  distance?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  duree?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateDepart?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateArrivee?: Date;

  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  status?: OrderStatus;
}
