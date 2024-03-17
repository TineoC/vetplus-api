import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ClinicServiceResult {
  @Field(() => [String], { nullable: true })
  services: string[];
}
