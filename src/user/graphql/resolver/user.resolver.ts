import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UserService } from '../../user.service';
import { User } from '../types/user.type';
import { CreatedUserResponse } from '../types/created-user-response.type';
import { CreateUserInput } from '../input/create-user.input';
import { UseGuards, UsePipes } from '@nestjs/common';
import { RolesGuard } from '@/global/guard/roles.guard';
import { Roles } from '@/global/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/global/guard/jwt-auth.guard';
import { UpdateUserInput } from '../input/update-user.input';
import { UpdateUserResponse } from '../types/update-user-response.type';
import { SaveUserImageInput } from '../input/save-user-image.input';
import { SaveUserImageResponse } from '../types/save-user-image-response.type';
import { AwsS3Service } from '@/aws_s3/aws_s3.service';
import { Status } from '@/global/constant/constants';
import { DeleteUserImageResponse } from '../types/delete-user-image-response.type';
import { DeleteUserImageInput } from '../input/delete-user-image.input';
import { YupValidationPipe } from '@/global/pipe/yup-validation.pipe';
import { UpdateUserInputSchema } from '@/global/schema/update-user-input.schema';
import { GeneralResponse } from '@/global/graphql/types/general-response.type';
import { RegisterFmcInput } from '../input/register-fmc.input';
import { UserProfile } from '../types/user-profile.type';
import { UpdateUserByAdminInput } from '../input/update-user-by-admin.input';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Mutation(() => CreatedUserResponse)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.userService.create(createUserInput);
  }

  @Mutation(() => UpdateUserResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.PET_OWNER, Role.VETERINARIAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(UpdateUserInputSchema))
  async updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @Context() context,
  ): Promise<UpdateUserResponse> {
    const result = await this.userService.update(
      updateUserInput,
      context.req.user.sub,
    );
    return result ? { result: 'COMPLETED' } : { result: 'FAILED' };
  }

  @Mutation(() => UpdateUserResponse)
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(UpdateUserInputSchema))
  async updateUserByAdmin(
    @Args('updateUserInput') updateUserByAdminInput: UpdateUserByAdminInput,
    @Context() context,
  ): Promise<UpdateUserResponse> {
    const { id, ...rest } = updateUserByAdminInput;
    const result = await this.userService.update(rest, id);
    return result ? { result: 'COMPLETED' } : { result: 'FAILED' };
  }

  @Mutation(() => SaveUserImageResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.PET_OWNER, Role.VETERINARIAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async saveUserImage(
    @Args('saveUserImageInput') saveUserImageInput: SaveUserImageInput,
  ): Promise<SaveUserImageResponse> {
    const { image, old_image } = saveUserImageInput;

    if (image) this.awsS3Service.validateImages(await image);

    const s3Location = image
      ? await this.awsS3Service.saveImageToS3(await image, 'users', old_image)
      : null;

    return !s3Location
      ? { result: Status.FAILED, image: s3Location }
      : { result: Status.COMPLETED, image: s3Location };
  }

  @Mutation(() => DeleteUserImageResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.PET_OWNER, Role.VETERINARIAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteUserImage(
    @Args('deleteUserImageInput') deleteUserImageInput: DeleteUserImageInput,
  ): Promise<DeleteUserImageResponse> {
    const { image } = deleteUserImageInput;

    const result = await this.awsS3Service.deleteImageToS3(image, 'users');

    return !result ? { result: Status.FAILED } : { result: Status.COMPLETED };
  }

  @Query(() => User)
  findUserById(@Args('id') id: string) {
    return this.userService.findById(id);
  }

  @Query(() => UserProfile)
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Context() context): Promise<UserProfile> {
    return this.userService.findById(context.req.user.sub);
  }

  @Query(() => [User])
  @Roles(Role.CLINIC_OWNER, Role.VETERINARIAN, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Mutation(() => GeneralResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.VETERINARIAN, Role.PET_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async registerFMC(
    @Args('registerFmcInput') registerFmcInput: RegisterFmcInput,
    @Context() context,
  ): Promise<GeneralResponse> {
    const { token_fmc } = registerFmcInput;
    const registeredFMC = await this.userService.registerTokenFMC(
      context.req.user.sub,
      token_fmc,
    );
    return registeredFMC
      ? { result: Status.COMPLETED }
      : { result: Status.FAILED };
  }
}
