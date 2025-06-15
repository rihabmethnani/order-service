import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNumber, IsOptional } from 'class-validator';

@InputType()
export class LocationInput {
  @Field(() => Number)
  @IsNumber()
  lat!: number;

  @Field(() => Number)
  @IsNumber()
  lng!: number;
}

@InputType()
export class UpdateLocationInput {
  @Field(() => String)
  @IsString()
  driverId?: string;

  @Field(() => LocationInput)
  location?: LocationInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  courseId?: string;
}
