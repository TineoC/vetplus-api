import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmployeeResolver } from './graphql/resolver/employee.resolver';
import { ClinicService } from '@/clinic/clinic.service';
import { AuthModule } from '@/auth/auth.module';
import { EmployeeService } from './employee.service';
import { NotificationModule } from '@/notification/notification.module';
import { UserModule } from '@/user/user.module';
import { AwsS3Module } from '@/aws_s3/aws_s3.module';
@Module({
  imports: [AuthModule, NotificationModule, UserModule, AwsS3Module],
  providers: [EmployeeService, EmployeeResolver, PrismaService, ClinicService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
