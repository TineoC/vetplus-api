import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class Deworming {
  @Field(() => String, { nullable: true })
  date: string;

  @Field(() => String, { nullable: true })
  product: string;
}
