import { IsEmail, IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateTenantDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsDateString()
  @IsOptional()
  endDate?: Date;
}
