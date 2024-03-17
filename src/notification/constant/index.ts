export enum NotificationKind {
  ACCOUNT_CREATION = 'Verification code to create account in vetplus',
  PASSWORD_RECOVERY = 'Verification code to get access again to your vetplus account',
  NEW_APPOINTMENT = 'New Appointment has been assigned to you',
  //ALERT_NEXT_APPOINTMENT = 'ALERT_NEXT_APPOINTMENT',
}

export type NotificationCategory =
  | 'APPOINTMENT'
  | 'HISTORY_ACCESS'
  | 'INVITE_TO_CLINIC'
  | 'AUTHENTICATION'
  | 'INVITE_TO_CLINIC_RESPONSE';

export type AppointmentNotificationInput = {
  petOwner: string;
  pet: string;
  veterinarian: string;
  date: Date;
  services: string[] | string;
};
