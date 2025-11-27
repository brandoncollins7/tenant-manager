import { IsBoolean } from 'class-validator';

export class RespondSwapDto {
  @IsBoolean()
  approved: boolean;
}
