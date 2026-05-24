import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationsService {
  enqueue(input: { userId: string; channel: "push" | "email" | "sms"; subject: string; body: string }) {
    return {
      ...input,
      providerStatus: "queued",
      queuedAt: new Date().toISOString()
    };
  }
}
