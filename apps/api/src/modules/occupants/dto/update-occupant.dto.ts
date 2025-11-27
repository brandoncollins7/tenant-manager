import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateOccupantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  choreDay?: number;
}
