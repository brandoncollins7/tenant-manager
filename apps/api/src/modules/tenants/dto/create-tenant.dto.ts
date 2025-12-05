import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsISO8601,
  IsUUID,
} from 'class-validator';

export class CreateTenantDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUUID()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  primaryOccupantName: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  choreDay?: number;
}
