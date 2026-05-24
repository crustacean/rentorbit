import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import type { MessageType } from "@rentorbit/shared";
import { ChatService } from "./chat.service.js";

@Controller("chat")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Get("threads")
  listThreads(@Headers("x-user-id") userId = "usr_renter_brian") {
    return this.chatService.listThreads(userId);
  }

  @Post("threads")
  getOrCreateThread(@Body() body: { listingId: string; renterId: string; ownerId: string }) {
    return this.chatService.getOrCreateThread(body);
  }

  @Get("threads/:threadId/messages")
  listMessages(@Param("threadId") threadId: string) {
    return this.chatService.listMessages(threadId);
  }

  @Post("threads/:threadId/messages")
  addMessage(
    @Param("threadId") threadId: string,
    @Headers("x-user-id") senderId = "usr_renter_brian",
    @Body() body: { type: MessageType; text?: string; payload?: unknown }
  ) {
    return this.chatService.addMessage({
      threadId,
      senderId,
      type: body.type,
      text: body.text,
      payload: body.payload
    });
  }
}
