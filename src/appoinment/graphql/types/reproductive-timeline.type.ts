import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ReproductiveTimeline {
  @Field(() => String, { nullable: true })
  reproductiveHistory: 'INTACT' | 'NEUTERED';

  @Field(() => String, { nullable: true })
  dateLastHeat: string;

  @Field(() => String, { nullable: true })
  dateLastBirth: string;
}
