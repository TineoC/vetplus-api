import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ScheduleAppointmentInput } from './graphql/input/schedule-appointment.input';
import { ServicesResult, UpdateAppointment } from './constant';
import { AppointmentHistory } from './graphql/types/appoinment-history.type';
import { FilterAppointmentByIdInput } from './graphql/input/filter-appointment-by-pet.input';
import { UpdateAppointmentInput } from './graphql/input/update-appointment.type';
import { FilterAppointmentByDateRangeInput } from './graphql/input/filter-appointment-by-range-date.input';
import { AppointmentVerified } from './graphql/types/appointment-verified.type';
import { ReminderAppointment } from '@/reminder/reminder';
import { Cron } from '@nestjs/schedule';
import { FilterAppointmentBySSInput } from './graphql/input/filter-appointment-by-ss.input';
import { tz } from 'moment-timezone';
import { AppointmentUserFmc } from './graphql/types/appointment-user-fmc.type';
import { UpdateAppointmentResumenInput } from './graphql/input/update-appointment-resumen.input';
import { OmitTx } from '@/Employee/constant';
import { customException } from '@/global/constant/constants';
import { FilterAppointmentVerifiedInput } from '@/appoinment/graphql/input/filter-appointment-verified.input';
import { ReassignAppointmentToVeterinarianInput } from './graphql/input/reassign-appointment-to-veterinarian.input';
import { AppointmentObservation } from './graphql/types/appointment-observation.type';
import { NotificationService } from '@/notification/notification.service';
import { SendNotificationInput } from '@/notification/graphql/input/sendNotification.input';
tz.setDefault('America/Santo_Domingo');
@Injectable()
export class AppointmentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly reminderAppointment: ReminderAppointment,
    private readonly notificationService: NotificationService,
  ) {}

  async scheduleAppointment(
    scheduleAppointmentInput: ScheduleAppointmentInput,
    id_owner: string,
    email: string,
  ): Promise<boolean> {
    const { services, start_at, id_clinicOwner, ...rest } =
      scheduleAppointmentInput;

    const { id_pet } = rest;
    const serviceResult =
      typeof services == 'string'
        ? services
        : JSON.stringify({ services: services });

    const transactionResult = await this.prismaService.$transaction(
      async (tx: OmitTx) => {
        const appoinmentCreated = await tx.appointment.create({
          data: {
            ...rest,
            start_at,
            services: serviceResult,
            id_owner,
          },
        });

        const scheduleAppointmentNotificationInput: SendNotificationInput = {
          category: 'APPOINTMENT',
          id_user: id_clinicOwner,
          title: 'New Appointment',
          subtitle: `${email} has requested a new appointment`,
          id_entity: id_pet,
        };

        const newNotification = await this.notificationService.saveNotification(
          scheduleAppointmentNotificationInput,
          tx,
        );

        await this.notificationService.sendNotificationToUser(
          id_clinicOwner,
          newNotification,
        );

        return appoinmentCreated ? true : false;
      },
    );

    return transactionResult;
  }

  async reassignAppointment(
    reassignAppointmentToVeterinarianInput: ReassignAppointmentToVeterinarianInput,
    id_owner: string,
  ): Promise<boolean> {
    const reassignedAppointment = await this.updateAppointment({
      ...reassignAppointmentToVeterinarianInput,
      id_owner,
    });
    return reassignedAppointment ? true : false;
  }

  async getAppointmentPerPetClinicOwner(
    filterAppointmentByIdInput: FilterAppointmentByIdInput,
    id_clinicOwner: string,
  ): Promise<AppointmentHistory[]> {
    return await this.getAppointmentPerPet(
      filterAppointmentByIdInput,
      null,
      id_clinicOwner,
    );
  }

  async getAppointmentPerPetByAnyOne(
    filterAppointmentByIdInput: FilterAppointmentByIdInput,
  ): Promise<AppointmentHistory[]> {
    return await this.getAppointmentPerPet(filterAppointmentByIdInput);
  }

  async getAppointmentPerPetByAllRoles(
    filterAppointmentByIdInput: FilterAppointmentByIdInput,
    id_owner: string,
  ) {
    return await this.getAppointmentPerPet(
      filterAppointmentByIdInput,
      id_owner,
    );
  }

  private async getAppointmentPerPet(
    filterAppointmentByIdInput: FilterAppointmentByIdInput,
    id_owner?: string,
    id_clinicOwner?: string,
  ): Promise<AppointmentHistory[]> {
    const { id: id_pet, state } = filterAppointmentByIdInput;
    const filterState = state ? { state } : {};
    const filterClinic = id_clinicOwner
      ? { Clinic: { id_owner: id_clinicOwner } }
      : {};

    const whereCondition = id_owner
      ? { id_owner, id_pet, ...filterState }
      : { id_pet, ...filterState, ...filterClinic };

    const getAllAppointment = await this.prismaService.appointment.findMany({
      where: whereCondition,
      include: {
        Pet: true,
        Clinic: true,
        Veterinarian: true,
        Owner: true,
      },
    });

    const getAllAppoinmentResult = this.getAllApointment(getAllAppointment);

    return getAllAppoinmentResult;
  }

  async getAppointmentDetailClinicOwner(
    filterAppointmentBySSInput: FilterAppointmentBySSInput,
    id_owner: string,
  ): Promise<AppointmentHistory[]> {
    return await this.getAppointmentDetail(
      filterAppointmentBySSInput,
      id_owner,
      false,
    );
  }

  async getAppointmentDetailByAllRoles(
    filterAppointmentBySSInput: FilterAppointmentBySSInput,
    id_owner: string,
  ) {
    return await this.getAppointmentDetail(
      filterAppointmentBySSInput,
      id_owner,
      true,
    );
  }

  private async getAppointmentDetail(
    filterAppointmentBySSInput: FilterAppointmentBySSInput,
    id_owner: string,
    asEveryOne: boolean,
  ): Promise<AppointmentHistory[]> {
    const filterByAllOrClinic = asEveryOne
      ? { id_owner }
      : {
          Clinic: {
            id_owner,
          },
        };
    const { state, appointment_status } = filterAppointmentBySSInput;

    const stateResult = state ? { state } : {};
    const appointmentStatusResult = appointment_status
      ? { appointment_status }
      : {};
    const getAllAppointment = await this.prismaService.appointment.findMany({
      where: {
        ...stateResult,
        ...appointmentStatusResult,
        ...filterByAllOrClinic,
      },
      include: {
        Pet: true,
        Clinic: true,
        Veterinarian: true,
        Owner: true,
      },
    });

    const getAllAppoinmentResult = this.getAllApointment(getAllAppointment);

    return getAllAppoinmentResult;
  }

  async updateAppointmentDetail(
    updateAppointmentInput: UpdateAppointmentInput,
    id_owner: string,
  ) {
    const updatedAppointment = await this.updateAppointment({
      ...updateAppointmentInput,
      id_owner,
    });
    return updatedAppointment;
  }

  private async updateAppointment(updateAppointment: UpdateAppointment) {
    const { id, id_owner, id_veterinarian, ...rest } = updateAppointment;
    const transactionResult = await this.prismaService.$transaction(
      async (tx: OmitTx) => {
        const appointmentUpdated = await tx.appointment.update({
          data: {
            id_veterinarian,
            ...rest,
          },
          select: {
            services: true,
            start_at: true,
            Veterinarian: {
              select: {
                names: true,
                surnames: true,
                email: true,
              },
            },
            Owner: {
              select: {
                names: true,
                surnames: true,
              },
            },
            Pet: {
              select: {
                name: true,
              },
            },
          },
          where: {
            id,
            Clinic: {
              id_owner,
            },
          },
        });

        const { names, surnames } = appointmentUpdated.Owner;
        const { services, start_at } = appointmentUpdated;
        const { name: petName } = appointmentUpdated.Pet;

        const status =
          rest.appointment_status === undefined ||
          rest.appointment_status === 'ACCEPTED';

        if (status && appointmentUpdated.Veterinarian) {
          const {
            names: veterinarianNames,
            surnames: veterinarianSurnames,
            email,
          } = appointmentUpdated.Veterinarian;

          this.notificationService.sendMailAppointment(email, {
            date: start_at,
            pet: petName,
            petOwner: names.concat(' ', surnames),
            services: this.getServicesAsStringOrStringArray(services),
            veterinarian: veterinarianNames.concat(veterinarianSurnames),
          });
        }
        return appointmentUpdated ? true : false;
      },
    );
    return transactionResult;
  }

  async updateAppointmentResumen(
    updateAppointmentResumenInput: UpdateAppointmentResumenInput,
  ) {
    const { id, id_clinic, id_owner, observations } =
      updateAppointmentResumenInput;

    await this.prismaService.$transaction(async (tx: OmitTx) => {
      const appointmentUpdated = await tx.appointment.update({
        data: {
          observations: JSON.stringify(observations),
          state: 'FINISHED',
        },
        where: {
          id,
          Clinic: {
            id: id_clinic,
          },
        },
      });

      const appointmentAttendance = await tx.clinic_User.upsert({
        create: {
          id_clinic,
          id_user: id_owner,
          clientAttendance: true,
        },
        where: {
          id_user_id_clinic: { id_user: id_owner, id_clinic },
        },
        update: {
          clientAttendance: true,
        },
      });

      if (!appointmentUpdated || !appointmentAttendance)
        throw customException.APPOINTMENT_RESUMEN_FAILED(null);

      return appointmentUpdated;
    });
  }

  async filterAppointmentDateRange(
    filterAppointmentByDateRangeInput: FilterAppointmentByDateRangeInput,
    id_entity: string,
    role: 'VETERINARIAN' | 'CLINIC_OWNER',
  ): Promise<AppointmentHistory[]> {
    const { start_at, end_at } = filterAppointmentByDateRangeInput;
    const andFiltering = [];
    const entityQuery =
      role === 'CLINIC_OWNER'
        ? {
            Clinic: {
              id_owner: id_entity,
            },
          }
        : { id_veterinarian: id_entity };
    if (start_at) andFiltering.push({ start_at: { gte: start_at } });
    if (end_at) andFiltering.push({ start_at: { lte: end_at } });
    const getAppointmentsByDateRange =
      await this.prismaService.appointment.findMany({
        include: {
          Pet: true,
          Clinic: true,
          Veterinarian: true,
          Owner: true,
        },
        where: {
          ...entityQuery,
          appointment_status: 'ACCEPTED',
          AND: andFiltering,
        },
      });

    const getAppointmentsByDateRangeResult: AppointmentHistory[] =
      this.getAllApointment(getAppointmentsByDateRange);

    return getAppointmentsByDateRangeResult;
  }

  async getAppointmentsVerified(
    filterAppointmentVerifiedInput: FilterAppointmentVerifiedInput,
    id_owner: string,
  ): Promise<AppointmentVerified[]> {
    const { start_at, end_at, state } = filterAppointmentVerifiedInput;
    const andFiltering = [];

    if (start_at) andFiltering.push({ start_at: { gte: start_at } });
    if (end_at) andFiltering.push({ start_at: { lte: end_at } });

    const getAppointmentsVerified =
      await this.prismaService.appointment.findMany({
        where: {
          Clinic: {
            id_owner,
          },
          state,
          OR: [
            { appointment_status: 'ACCEPTED' },
            { appointment_status: 'DENIED' },
          ],
          AND: andFiltering,
        },
        include: {
          Owner: true,
        },
      });

    const getAppointmentsVerifiedResult: AppointmentVerified[] =
      this.getAllApointment(getAppointmentsVerified);

    return getAppointmentsVerifiedResult;
  }

  async getAppointmentToScheduleTask(): Promise<AppointmentUserFmc[]> {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 2);

    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');

    const todayformattedDate = `${year}-${month}-${day}`;
    const tomorrowformattedDate = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
    const incomingAppointmentForNotification =
      await this.prismaService.appointment.findMany({
        include: {
          Owner: {
            include: {
              User_Fmc: true,
            },
          },
        },
        where: {
          state: 'PENDING',
          AND: [
            { start_at: { gte: new Date(todayformattedDate) } },
            { start_at: { lte: new Date(tomorrowformattedDate) } },
          ],
        },
      });
    const incomingAppointmentForNotificationResult: AppointmentUserFmc[] =
      this.getAllApointment(incomingAppointmentForNotification);

    return incomingAppointmentForNotificationResult;
  }

  @Cron('0 30 4 * * *', { timeZone: 'America/Santo_Domingo' })
  async handleCron() {
    const appointmentToScheduleTask = await this.getAppointmentToScheduleTask();
    console.log(appointmentToScheduleTask);
    await this.reminderAppointment.setScheduleFormat(appointmentToScheduleTask);
  }

  private getAllApointment(getAllApointment: any[]) {
    const getAllAppoinmentResult = getAllApointment.map((row) => {
      const { services, observations, ...rest } = row;
      const servicesResult = this.getServicesAsStringOrStringArray(services);

      const observationsParser: AppointmentObservation = {
        ...JSON.parse(observations),
      };

      return {
        ...rest,
        services: servicesResult,
        observations: observationsParser,
      };
    });
    return getAllAppoinmentResult;
  }

  private getServicesAsStringOrStringArray(
    servicesStr: string,
  ): string | string[] {
    try {
      const services: ServicesResult = JSON.parse(servicesStr);
      const { services: serviceArray } = services;
      return serviceArray;
    } catch (ex) {
      return servicesStr;
    }
  }
}
