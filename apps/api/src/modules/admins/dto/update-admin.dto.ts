import { IsEmail, IsString, IsEnum, IsArray, IsUUID, IsOptional } from 'class-validator';
import { AdminRole, AdminRoleType } from '../../../common/constants/admin-roles';

export class UpdateAdminDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRoleType;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  unitIds?: string[];
}
