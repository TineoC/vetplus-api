import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class Vaccines {
  @Field(() => String, { nullable: true })
  date: string;

  @Field(() => String, { nullable: true })
  vaccineBrand: string;

  @Field(() => String, { nullable: true })
  vaccineBatch: string;
}
