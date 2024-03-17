import { InputType, Field } from '@nestjs/graphql';
@InputType()
export class DeleteClinicImageInput {
  @Field(() => String, { nullable: true })
  id_owner: string;

  @Field(() => String)
  image: string;
}
