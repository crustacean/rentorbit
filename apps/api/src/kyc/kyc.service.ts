import { BadRequestException, Injectable } from "@nestjs/common";
import { store } from "../common/in-memory-store.js";

export type IprsIdType = "National ID" | "Passport number" | "Alien ID";

export type IprsCheckRequest = {
  firstName: string;
  lastName: string;
  idType: IprsIdType;
  idNumber: string;
};

function idNumberMatchesType(idType: IprsIdType, idNumber: string) {
  const normalized = idNumber.trim().toUpperCase();

  if (idType === "National ID") {
    return /^\d{6,10}$/.test(normalized);
  }

  return /^[A-Z0-9]{6,12}$/.test(normalized);
}

function getIdLast4(idNumber: string) {
  return idNumber.trim().slice(-4).padStart(4, "*");
}

@Injectable()
export class KycService {
  validateIprsIdentity(input: IprsCheckRequest) {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const idNumber = input.idNumber.trim().toUpperCase();

    if (firstName.length < 2 || lastName.length < 2 || !idNumberMatchesType(input.idType, idNumber)) {
      throw new BadRequestException("ID validation check was unsuccessful.");
    }

    return {
      status: "verified" as const,
      provider: "licensed-iprs-provider",
      providerReference: `iprs_${Date.now().toString(36)}`,
      legalName: `${firstName} ${lastName}`,
      idType: input.idType,
      idNumberLast4: getIdLast4(idNumber)
    };
  }

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
