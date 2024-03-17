import { InputType, Field } from '@nestjs/graphql';
import { UpdateUserInput } from './update-user.input';
import { Role } from '@prisma/client';

@InputType()
export class UpdateUserByAdminInput extends UpdateUserInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  role: Role;

  @Field(() => Boolean)
  status: boolean;

  @Field(() => String)
  email: string;
}
