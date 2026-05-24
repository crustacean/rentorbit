import { BadRequestException, Injectable } from "@nestjs/common";
import { store } from "../common/in-memory-store.js";

@Injectable()
export class KycService {
  startVerification(userId: string) {
    const user = store.users.get(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    user.kycStatus = "pending";
    store.users.set(user.id, user);

    return {
      userId,
      status: user.kycStatus,
      provider: "licensed-iprs-provider",
      nextAction: "redirect_or_embed_vendor_flow"
    };
  }

  markVerified(userId: string) {
    const user = store.users.get(userId);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    user.kycStatus = "verified";
    store.users.set(user.id, user);
    return user;
  }
}
