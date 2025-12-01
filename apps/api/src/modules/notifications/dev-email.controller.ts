import { Controller, Get, Param, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { devEmailStore, DevEmail } from './email';

interface MessageEvent {
  data: string | object;
}

@Controller('dev/emails')
export class DevEmailController {
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return devEmailStore.emailSubject.asObservable().pipe(
      map((email: DevEmail) => ({
        data: JSON.stringify(email),
      })),
    );
  }

  @Get()
  getAll(): DevEmail[] {
    return devEmailStore.getAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string): DevEmail | undefined {
    return devEmailStore.getById(id);
  }
}
