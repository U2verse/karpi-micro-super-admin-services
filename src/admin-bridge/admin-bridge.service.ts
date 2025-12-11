import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AdminBridgeService {
  private readonly clientsServiceUrl =
    process.env.CLIENTS_SERVICE_URL ?? 'http://localhost:3001/api';

  constructor(private readonly http: HttpService) {}

  async getClientDetails(clientId: number) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.clientsServiceUrl}/clients/${clientId}`),
      );
      return res.data;
    } catch (e) {
      throw new InternalServerErrorException('Failed to fetch client details');
    }
  }

  async changeClientStatus(
    clientId: number,
    newStatus: string,
    reason?: string,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(
          `${this.clientsServiceUrl}/admin/clients/${clientId}/status`,
          { status: newStatus, reason },
        ),
      );
      return res.data;
    } catch {
      throw new InternalServerErrorException('Failed to change client status');
    }
  }
}
