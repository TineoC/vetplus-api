import { Args, Context, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '@/global/guard/jwt-auth.guard';
import { RolesGuard } from '@/global/guard/roles.guard';
import { Roles } from '@/global/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { AddClinicInput } from '../input/add-clinic.input';
import { ClinicService } from '@/clinic/clinic.service';
import { ClinicResponse } from '../types/clinic-response.type';
import { ClinicServiceResult } from '../types/clinic-service-result.type';
import { MarkAsFavoriteClinicInput } from '../input/mark-as-favorite-clinic.input';
import { FavoriteClinicResult } from '../types/favorite-clinic-result.type';
import { ScoreClinicInput } from '../input/score-clinic.input';
import { ScoreClinicResponse } from '../types/score-clinic-response.type';
import { YupValidationPipe } from '@/global/pipe/yup-validation.pipe';
import { AddClinicInputSchema } from '@/global/schema/add-clinic-input.schema';
import { ScoreClinicInputSchema } from '@/global/schema/score-clinic-input.schema';
import { GenericByIdInput } from '@/global/graphql/input/generic-by-id.input';
import { Status } from '@/global/constant/constants';
import { GetAllClinic } from '../types/get-all-clinic.type';
import { GetAllClientsResult } from '../types/get-all-clients-result.type';
import { UpdateClinicInput } from '../input/update-clinic.input';

import { GetClinicResult } from '../types/get-clinic-result.type';
import { UpdateClinicInputSchema } from '@/global/schema/update-clinic-input.schema';
import { TurnClinicStatusInput } from '../input/turn-clinic-status.input';
import { UploadClinicImageInput } from '../input/save-clinic-image.input';
import { AwsS3Service } from '@/aws_s3/aws_s3.service';
import { SaveClinicImageResponse } from '../types/save-clinic-image-response.type';
import { DeleteClinicImageResponse } from '../types/delete-clinic-image-response.type';
import { DeleteClinicImageInput } from '../input/delete-clinic-image.input';
import { UpdateClinicByAdminInput } from '../input/update-clinic-by-admin.input';
@Resolver()
export class ClinicResolver {
  constructor(
    private readonly clinicService: ClinicService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Mutation(() => ClinicResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(AddClinicInputSchema))
  async registerClinic(
    @Args('addClinicInput') addClinicInput: AddClinicInput,
    @Context() context,
  ): Promise<ClinicResponse> {
    const { id, ...rest } = addClinicInput;

    if (context.req.user.role == Role.ADMIN && !id)
      return { result: Status.FAILED };

    const result = await this.clinicService.createClinic(
      rest,
      context.req.user.role == Role.ADMIN ? id : context.req.user.sub,
    );

    return !result ? { result: Status.FAILED } : { result: Status.COMPLETED };
  }

  @Mutation(() => ClinicResponse)
  @Roles(Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(UpdateClinicInputSchema))
  async updateClinic(
    @Args('updateClinicInput') updateClinicInput: UpdateClinicInput,
    @Context() context,
  ): Promise<ClinicResponse> {
    const result = await this.clinicService.updateClinic(
      updateClinicInput,
      context.req.user.sub,
    );

    return !result ? { result: Status.FAILED } : { result: Status.COMPLETED };
  }

  @Mutation(() => ClinicResponse)
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(UpdateClinicInputSchema))
  async updateClinicByAdmin(
    @Args('updateClinicByAdminInput')
    updateClinicByAdminInput: UpdateClinicByAdminInput,
    @Context() context,
  ): Promise<ClinicResponse> {
    const { id, ...rest } = updateClinicByAdminInput;
    const result = await this.clinicService.updateClinic(rest, id);

    return !result ? { result: Status.FAILED } : { result: Status.COMPLETED };
  }

  @Mutation(() => SaveClinicImageResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async uploadClinicImage(
    @Args('uploadClinicImageInput')
    uploadClinicImageInput: UploadClinicImageInput,
    @Context() context,
  ): Promise<SaveClinicImageResponse> {
    const { id_owner } = uploadClinicImageInput;

    if (!id_owner && Role.ADMIN) return { result: Status.FAILED, image: null };

    const { execute, image } = await this.clinicService.uploadClinicImage(
      uploadClinicImageInput,
      context.req.user.role == Role.ADMIN ? id_owner : context.req.user.sub,
    );

    return !execute
      ? { result: Status.FAILED, image: image }
      : { result: Status.COMPLETED, image: image };
  }

  @Mutation(() => DeleteClinicImageResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteClinicImage(
    @Args('deleteClinicImageInput')
    deleteClinicImageInput: DeleteClinicImageInput,
    @Context() context,
  ): Promise<DeleteClinicImageResponse> {
    const { id_owner } = deleteClinicImageInput;

    if (context.req.user.role == Role.ADMIN && !id_owner)
      return { result: Status.FAILED };

    const deletedClinicImage = await this.clinicService.deleteClinicImage(
      deleteClinicImageInput,
      context.req.user.role == Role.ADMIN ? id_owner : context.req.user.sub,
    );

    return !deletedClinicImage
      ? { result: Status.FAILED }
      : { result: Status.COMPLETED };
  }

  @Mutation(() => ClinicResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async changeClinicStatus(
    @Args('turnClinicStatusInput') turnClinicStatusInput: TurnClinicStatusInput,
    @Context() context,
  ): Promise<ClinicResponse> {
    const result = await this.clinicService.changeMyClinicStatus(
      turnClinicStatusInput,
      context.req.user.sub,
    );

    return !result ? { result: Status.FAILED } : { result: Status.COMPLETED };
  }

  @Query(() => GetClinicResult)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getMyClinic(@Context() context): Promise<GetClinicResult> {
    const result = await this.clinicService.getMyClinic(context.req.user.sub);
    return result;
  }

  @Query(() => [GetAllClinic])
  async getAllClinic(): Promise<GetAllClinic[]> {
    return await this.clinicService.getAllClinic();
  }

  @Query(() => GetClinicResult)
  async getClinicById(
    @Args('getClinicByIdInput') getClinicByIdInput: GenericByIdInput,
  ): Promise<GetClinicResult> {
    const { id } = getClinicByIdInput;
    return await this.clinicService.getClinicById(id);
  }

  @Query(() => ClinicServiceResult)
  async getAllClinicServices(
    @Args('genericByIdInput')
    genericByIdInput: GenericByIdInput,
  ): Promise<ClinicServiceResult> {
    const { id } = genericByIdInput;
    return await this.clinicService.getAllServicesById(id);
  }

  @Mutation(() => ClinicResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.VETERINARIAN, Role.PET_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async markAsFavoriteClinic(
    @Args('markAsFavoriteClinicInput')
    markAsFavoriteClinicInput: MarkAsFavoriteClinicInput,
    @Context() context,
  ): Promise<ClinicResponse> {
    const result = await this.clinicService.markAsFavoriteClinic(
      markAsFavoriteClinicInput,
      context.req.user.sub,
    );

    return result ? { result: Status.COMPLETED } : { result: Status.FAILED };
  }

  @Query(() => [FavoriteClinicResult])
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.VETERINARIAN, Role.PET_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllFavoriteClinic(
    @Context() context,
  ): Promise<FavoriteClinicResult[]> {
    return await this.clinicService.getAllFavoriteById(context.req.user.sub);
  }

  @Mutation(() => ScoreClinicResponse)
  @Roles(Role.ADMIN, Role.CLINIC_OWNER, Role.VETERINARIAN, Role.PET_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(ScoreClinicInputSchema))
  async scoreClinic(
    @Args('scoreClinicInput') scoreClinicInput: ScoreClinicInput,
    @Context() context,
  ): Promise<ScoreClinicResponse> {
    const result = await this.clinicService.scoreClinic(
      scoreClinicInput,
      context.req.user.sub,
    );
    return result ? { result: Status.COMPLETED } : { result: Status.FAILED };
  }

  @Query(() => [GetAllClientsResult])
  @Roles(Role.ADMIN, Role.CLINIC_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UsePipes(new YupValidationPipe(ScoreClinicInputSchema))
  async getAllClients(@Context() context): Promise<GetAllClientsResult[]> {
    const result = await this.clinicService.GetAllClients(context.req.user.sub);
    return result;
  }
}
