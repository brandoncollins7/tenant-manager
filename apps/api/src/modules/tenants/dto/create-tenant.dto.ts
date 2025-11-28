import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateTenantDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  primaryOccupantName: string;

  @IsInt()
  @Min(0)
  @Max(6)
  choreDay: number;
}
