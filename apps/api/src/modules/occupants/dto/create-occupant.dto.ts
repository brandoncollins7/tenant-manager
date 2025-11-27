import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateOccupantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  @Max(6)
  choreDay: number;
}
