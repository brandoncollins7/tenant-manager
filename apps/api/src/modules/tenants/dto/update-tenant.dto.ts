import { IsEmail, IsString, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateTenantDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @ValidateIf((o) => o.roomId !== null)
  @IsUUID()
  @IsOptional()
  roomId?: string | null;
}
