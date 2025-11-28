import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // If it's an API route, return the 404
    if (request.url.startsWith('/api')) {
      response.status(404).json({
        statusCode: 404,
        message: 'Not Found',
      });
      return;
    }

    // For all other routes, serve index.html (SPA fallback)
    response.sendFile(join(__dirname, '..', '..', '..', 'web', 'dist', 'index.html'));
  }
}
