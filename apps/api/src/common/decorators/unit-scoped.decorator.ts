import { SetMetadata } from '@nestjs/common';

export type UnitScopedResource = 'tenant' | 'room' | 'occupant' | 'photo';

export interface UnitScopedOptions {
  resource: UnitScopedResource;
  param: string;
}

export const UNIT_SCOPED_KEY = 'unitScoped';

export const UnitScoped = (
  resource: UnitScopedResource,
  param: string = 'id',
) => SetMetadata(UNIT_SCOPED_KEY, { resource, param } as UnitScopedOptions);