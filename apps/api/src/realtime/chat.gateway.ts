import { Inject } from "@nestjs/common";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "../chat/chat.service.js";

@WebSocketGateway({
  cors: {
    origin: "*"
  }
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @SubscribeMessage("join_thread")
  joinThread(@ConnectedSocket() client: Socket, @MessageBody() body: { threadId: string }) {
    client.join(body.threadId);
    return { joined: body.threadId };
  }

  @SubscribeMessage("send_message")
  sendMessage(@MessageBody() body: { threadId: string; senderId: string; text: string }) {
    const message = this.chatService.addMessage({
      threadId: body.threadId,
      senderId: body.senderId,
      type: "text",
      text: body.text
    });
    this.server.to(body.threadId).emit("message_created", message);
    return message;
  }
}
