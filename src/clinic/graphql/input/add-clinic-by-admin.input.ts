import { InputType, Field } from '@nestjs/graphql';
import { AddClinicInput } from './add-clinic.input';

@InputType()
export class AddClinicByAdminInput extends AddClinicInput {
  @Field(() => String)
  id: string;
}
