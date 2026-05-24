import { Body, Controller, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("signup")
  signup(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      idType: "National ID" | "Passport number" | "Alien ID";
      idNumber: string;
      email: string;
      password: string;
    }
  ) {
    return this.authService.signup(body);
  }

  @Post("signin")
  signin(@Body() body: { email: string; password: string }) {
    return this.authService.signin(body);
  }
}
