import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { store, type UserRecord } from "../common/in-memory-store.js";
import { type IprsCheckRequest, KycService } from "../kyc/kyc.service.js";

type SignupRequest = IprsCheckRequest & {
  email: string;
  password: string;
};

type SigninRequest = {
  email: string;
  password: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    legalName: user.legalName,
    kycStatus: user.kycStatus
  };
}

@Injectable()
export class AuthService {
  constructor(@Inject(KycService) private readonly kycService: KycService) {}

  signup(input: SignupRequest) {
    const email = normalizeEmail(input.email);

    if (!isValidEmail(email) || input.password.length < 8) {
      throw new BadRequestException("Email or password is invalid.");
    }

    const existing = Array.from(store.users.values()).find((user) => user.email === email);
    if (existing) {
      throw new BadRequestException("An account already exists for this email.");
    }

    const iprsResult = this.kycService.validateIprsIdentity(input);
    const user: UserRecord = {
      id: store.nextId("usr"),
      email,
      password: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      legalName: iprsResult.legalName,
      idType: input.idType,
      idNumberLast4: iprsResult.idNumberLast4,
      kycStatus: "verified",
      createdAt: new Date().toISOString()
    };

    store.users.set(user.id, user);
    return toPublicUser(user);
  }

  signin(input: SigninRequest) {
    const email = normalizeEmail(input.email);
    const user = Array.from(store.users.values()).find((candidate) => candidate.email === email && candidate.password === input.password);

    if (!user) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    return toPublicUser(user);
  }
}
