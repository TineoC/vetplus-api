import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  AddClinic,
  ClinicType,
  FavoriteClinic,
  ServiceResult,
} from './constant';
import { MarkAsFavoriteClinicInput } from './graphql/input/mark-as-favorite-clinic.input';
import { ScoreClinicInput } from './graphql/input/score-clinic.input';
import { SummaryScore, customException } from '@/global/constant/constants';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { OmitTx } from '@/Employee/constant';
import { GetAllClinic } from './graphql/types/get-all-clinic.type';
import { GetAllClientsResult } from './graphql/types/get-all-clients-result.type';
import { UpdateClinicInput } from './graphql/input/update-clinic.input';
import { GetClinicResult } from './graphql/types/get-clinic-result.type';
import { Schedule } from './graphql/types/schedule.type';
import { Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TurnClinicStatusInput } from './graphql/input/turn-clinic-status.input';
import { UploadClinicImageInput } from './graphql/input/save-clinic-image.input';
import { AwsS3Service } from '@/aws_s3/aws_s3.service';
import { DeleteClinicImageInput } from './graphql/input/delete-clinic-image.input';

@Injectable()
export class ClinicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly awsS3Service: AwsS3Service,
  ) {}
  async createClinic(addClinic: AddClinic, id_owner: string): Promise<boolean> {
    try {
      const result = await this.prismaService.$transaction(
        async (tx: OmitTx) => {
          const createClinic = await tx.clinic.create({
            data: {
              ...addClinic,
              id_owner,
            },
          });

          if (!createClinic) return false;

          const score = await tx.clinic_Summary_Score.create({
            data: {
              id_clinic: createClinic.id,
            },
          });

          if (!score) throw Error('Did not create clinic score');

          const userRoleUpdated = await tx.user.update({
            data: {
              role: Role.CLINIC_OWNER,
            },
            where: {
              id: id_owner,
            },
          });

          if (!userRoleUpdated) throw Error('User Role did not updated');

          return true;
        },
      );

      if (!result) return false;
      return true;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code == 'P2002'
      ) {
        throw customException.ALREADY_HAVE_CLINIC(null);
      } else {
        throw customException.CREATION_CLINIC_FAILED(error.message);
      }
    }
  }

  async uploadClinicImage(
    uploadClinicImageInput: UploadClinicImageInput,
    id_owner: string,
  ): Promise<{ execute: boolean; image: string }> {
    const { image, old_image } = uploadClinicImageInput;
    if (image) this.awsS3Service.validateImages(await image);

    const s3Location = image
      ? await this.awsS3Service.saveImageToS3(await image, 'clinics', old_image)
      : null;

    const updatedClinic =
      s3Location &&
      (await this.prismaService.clinic.update({
        data: { image: s3Location },
        where: { id_owner },
      }));

    return updatedClinic
      ? { execute: true, image: s3Location }
      : { execute: false, image: s3Location };
  }

  async deleteClinicImage(
    deleteClinicImageInput: DeleteClinicImageInput,
    id_owner: string,
  ): Promise<boolean> {
    const { image } = deleteClinicImageInput;

    const deletedClinicImageFromAwsS3 = await this.awsS3Service.deleteImageToS3(
      image,
      'clinics',
    );

    const deletedClinicImageFromDB =
      deletedClinicImageFromAwsS3 &&
      (await this.prismaService.clinic.update({
        data: { image },
        where: { id_owner },
      }));

    return deletedClinicImageFromDB ? true : false;
  }

  async updateClinic(UpdateClinicInput: UpdateClinicInput, id_owner: string) {
    const { services, ...rest } = UpdateClinicInput;
    const result = await this.prismaService.clinic.update({
      data: {
        ...rest,
        services: services ? JSON.stringify({ services: services }) : null,
      },
      where: {
        id_owner,
      },
    });
    return result ? true : false;
  }

  async getClinicById(id: string): Promise<GetClinicResult> {
    const { services, schedule, ...rest } =
      await this.prismaService.clinic.findFirst({
        include: {
          ClinicSummaryScore: {
            select: {
              total_points: true,
              total_users: true,
            },
          },
        },
        where: {
          id,
        },
      });

    const scheduleResult: Schedule = this.convertJsonObjectToScheduleType(
      schedule as Prisma.JsonObject,
    );

    const clinicServices = this.getClinicServicesAsArray(services);
    const result = this.addServiceResultToGetClinicResult(clinicServices, rest);
    result.schedule = scheduleResult;

    return result;
  }

  async getMyClinic(id_owner: string): Promise<GetClinicResult> {
    const { services, schedule, ...rest } =
      await this.prismaService.clinic.findUnique({
        include: {
          ClinicSummaryScore: {
            select: {
              total_points: true,
              total_users: true,
            },
          },
        },
        where: {
          id_owner,
        },
      });

    const scheduleResult: Schedule = this.convertJsonObjectToScheduleType(
      schedule as Prisma.JsonObject,
    );

    const clinicServices = this.getClinicServicesAsArray(services);
    const result = this.addServiceResultToGetClinicResult(clinicServices, rest);
    result.schedule = scheduleResult;

    return result;
  }

  async getAllClinic(): Promise<GetAllClinic[]> {
    const clinicsData = await this.prismaService.clinic.findMany({
      where: {
        status: true,
      },
      include: {
        ClinicSummaryScore: true,
      },
    });
    const getAllClinic: GetAllClinic[] = clinicsData.map((row) => {
      const { services, ...rest } = row;
      const servicesArray = this.getClinicServicesAsArray(services);
      return {
        ...rest,
        services: servicesArray?.services,
      };
    });

    return getAllClinic;
  }

  async changeMyClinicStatus(
    turnClinicStatusInput: TurnClinicStatusInput,
    id_owner: string,
  ): Promise<boolean> {
    const { status } = turnClinicStatusInput;
    const result = await this.prismaService.clinic.update({
      data: {
        status,
      },
      where: {
        id_owner,
      },
    });

    return result ? true : false;
  }

  private convertJsonObjectToScheduleType(schedule: Prisma.JsonObject) {
    const result = plainToInstance(Schedule, schedule);
    return result;
  }

  async getAllServicesById(id_clinic: string): Promise<ServiceResult> {
    const clinic = await this.prismaService.clinic.findFirst({
      select: {
        services: true,
      },
      where: {
        id: id_clinic,
      },
    });

    if (!clinic.services) return null;

    return this.getClinicServicesAsArray(clinic.services);
  }

  private addServiceResultToGetClinicResult(
    serviceResult: ServiceResult,
    clinic: ClinicType,
  ): GetClinicResult {
    const getMyClinic: GetClinicResult = {
      ...clinic,
      services: serviceResult?.services,
      schedule: null,
    };
    return getMyClinic;
  }

  private getClinicServicesAsArray(servicesStr: string): ServiceResult {
    if (!servicesStr) return null;
    const clinic_service: ServiceResult = JSON.parse(servicesStr);
    return clinic_service;
  }

  async getAllFavoriteById(id_user: string): Promise<FavoriteClinic[]> {
    const result = await this.prismaService.clinic_User.findMany({
      where: {
        id_user,
        favorite: true,
      },
      include: {
        Clinic: {
          select: {
            name: true,
            address: true,
            image: true,
          },
        },
      },
    });
    return result;
  }

  async markAsFavoriteClinic(
    markAsFavortiClinicInput: MarkAsFavoriteClinicInput,
    id_user: string,
  ): Promise<boolean> {
    const { id, favorite } = markAsFavortiClinicInput;
    const result = await this.prismaService.clinic_User.upsert({
      where: {
        id_user_id_clinic: { id_user, id_clinic: id },
      },
      update: {
        favorite,
      },
      create: {
        favorite,
        id_user,
        id_clinic: id,
      },
    });

    return result ? true : false;
  }

  async scoreClinic(
    scoreClinicInput: ScoreClinicInput,
    id_user: string,
  ): Promise<boolean> {
    const { id_clinic } = scoreClinicInput;
    const result = await this.upsertScoreClinic(scoreClinicInput, id_user);

    const total_score_clinic = await this.getTotalScoreClinic(id_clinic);

    await this.upsertSummaryScoreClinic(total_score_clinic, id_clinic);

    return result;
  }

  async getTotalScoreClinic(id_clinic: string) {
    const result = await this.prismaService.clinic_User.groupBy({
      by: 'id_clinic',
      _sum: {
        points: true,
      },
      _count: true,
      where: {
        id_clinic,
        points: {
          not: {
            equals: null,
          },
        },
      },
    });
    return result[0];
  }

  async GetAllClients(id_user: string): Promise<GetAllClientsResult[]> {
    const result = await this.prismaService.clinic_User.findMany({
      where: {
        clientAttendance: true,
        Clinic: {
          id_owner: id_user,
        },
      },
      include: {
        User: {
          include: {
            Pet: {
              include: {
                Breed: true,
              },
            },
            AppointmentOwner: {
              select: {
                start_at: true,
                end_at: true,
              },
              orderBy: {
                start_at: 'desc',
              },
              take: 1,
              where: {
                state: 'FINISHED',
              },
            },
          },
        },
      },
    });
    return result;
  }

  private async upsertScoreClinic(
    scoreClinicInput: ScoreClinicInput,
    id_user: string,
  ): Promise<boolean> {
    const { id_clinic, score } = scoreClinicInput;
    const result = await this.prismaService.clinic_User.upsert({
      where: {
        id_user_id_clinic: { id_user, id_clinic },
      },
      update: {
        points: score,
      },
      create: {
        points: score,
        id_user,
        id_clinic,
      },
    });

    return result ? true : false;
  }

  private async upsertSummaryScoreClinic(
    summaryScoreClinic: SummaryScore,
    id_clinic: string,
  ): Promise<boolean> {
    const {
      _count,
      _sum: { points },
    } = summaryScoreClinic;
    const result = await this.prismaService.clinic_Summary_Score.upsert({
      where: {
        id_clinic,
      },
      update: {
        total_users: _count,
        total_points: points,
      },
      create: {
        total_users: _count,
        total_points: points,
        id_clinic,
      },
    });
    return result ? true : false;
  }
}
