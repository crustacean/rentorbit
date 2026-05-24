import { Injectable, NotFoundException } from "@nestjs/common";
import type { MessageType } from "@rentorbit/shared";
import { store, type ChatMessageRecord, type ChatThreadRecord } from "../common/in-memory-store.js";

@Injectable()
export class ChatService {
  getOrCreateThread(input: { listingId: string; renterId: string; ownerId: string }): ChatThreadRecord {
    const existing = [...store.threads.values()].find(
      (thread) =>
        thread.listingId === input.listingId && thread.renterId === input.renterId && thread.ownerId === input.ownerId
    );
    if (existing) {
      return existing;
    }

    const thread: ChatThreadRecord = {
      id: store.nextId("thr"),
      listingId: input.listingId,
      renterId: input.renterId,
      ownerId: input.ownerId,
      createdAt: new Date().toISOString()
    };
    store.threads.set(thread.id, thread);
    return thread;
  }

  listThreads(userId: string): ChatThreadRecord[] {
    return [...store.threads.values()].filter((thread) => thread.ownerId === userId || thread.renterId === userId);
  }

  getThread(id: string): ChatThreadRecord {
    const thread = store.threads.get(id);
    if (!thread) {
      throw new NotFoundException(`Thread ${id} was not found`);
    }
    return thread;
  }

  addMessage(input: {
    threadId: string;
    senderId: string;
    type: MessageType;
    text?: string;
    payload?: unknown;
  }): ChatMessageRecord {
    this.getThread(input.threadId);
    const message: ChatMessageRecord = {
      id: store.nextId("msg"),
      threadId: input.threadId,
      senderId: input.senderId,
      type: input.type,
      text: input.text,
      payload: input.payload,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    store.messages.set(message.id, message);
    return message;
  }

  listMessages(threadId: string): ChatMessageRecord[] {
    this.getThread(threadId);
    return [...store.messages.values()]
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
