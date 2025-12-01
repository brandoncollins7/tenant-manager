import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestUser } from './test-auth';

export class TestClient {
  constructor(
    private readonly app: INestApplication,
    private auth?: TestUser,
  ) {}

  withAuth(auth: TestUser): TestClient {
    return new TestClient(this.app, auth);
  }

  private addAuth(req: request.Test): request.Test {
    if (this.auth) {
      return req.set('Authorization', `Bearer ${this.auth.token}`);
    }
    return req;
  }

  get(url: string): request.Test {
    return this.addAuth(request(this.app.getHttpServer()).get(`/api${url}`));
  }

  post(url: string, body?: object): request.Test {
    const req = request(this.app.getHttpServer()).post(`/api${url}`);
    if (body) req.send(body);
    return this.addAuth(req);
  }

  patch(url: string, body?: object): request.Test {
    const req = request(this.app.getHttpServer()).patch(`/api${url}`);
    if (body) req.send(body);
    return this.addAuth(req);
  }

  delete(url: string): request.Test {
    return this.addAuth(request(this.app.getHttpServer()).delete(`/api${url}`));
  }
}
