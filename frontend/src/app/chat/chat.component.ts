import { Component, inject } from '@angular/core';
import { ChatService, ChatResponse } from './chat.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  imports: [ReactiveFormsModule, JsonPipe],
})
export class ChatComponent {
  readonly #chatService = inject(ChatService);

  chatInputControl = new FormControl('');
  messages: Array<{
    text: string;
    sender: 'user' | 'bot';
    sources?: unknown[];
  }> = [];
  isLoading = false;

  async onSendMessage() {
    const userInput = this.chatInputControl.value;
    if (!userInput) return;

    if (!userInput.trim()) return;

    const userMessage = userInput;
    this.messages.push({ text: userMessage, sender: 'user' });
    this.chatInputControl.reset();
    this.isLoading = true;

    try {
      this.#chatService.sendMessage(userMessage).subscribe({
        next: (response: ChatResponse) => {
          this.messages.push({
            text: response.answer,
            sender: 'bot',
            sources: response.sources,
          });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.messages.push({
            text: 'Error: Could not get a response.',
            sender: 'bot',
          });
          this.isLoading = false;
        },
      });
    } catch (error) {
      console.error('Error in onSendMessage:', error);
      this.messages.push({ text: 'Client-side error.', sender: 'bot' });
      this.isLoading = false;
    }
  }
}
