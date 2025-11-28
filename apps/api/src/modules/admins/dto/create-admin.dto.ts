import { IsEmail, IsString, IsEnum, IsArray, IsUUID, IsOptional } from 'class-validator';
import { AdminRole, AdminRoleType } from '../../../common/constants/admin-roles';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsEnum(AdminRole)
  role: AdminRoleType;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  unitIds?: string[];
}
