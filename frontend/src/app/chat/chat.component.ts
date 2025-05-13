import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ChatService, StreamedChatResponsePart, Source } from './chat.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageBubbleComponent } from './message-bubble/message-bubble.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  imports: [
    ReactiveFormsModule,
    TextareaModule,
    ButtonModule,
    MessageBubbleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  readonly #chatService = inject(ChatService);

  form = new FormGroup({ message: new FormControl('') });
  messages = signal<
    Array<{
      text: string;
      sender: 'user' | 'bot';
      sources?: Source[];
      isLoading?: boolean;
    }>
  >([]);
  isGloballyLoading = signal(false);

  async onSendMessage() {
    const userInput = this.form.get('message')?.value;
    if (!userInput?.trim()) {
      return;
    }

    const userMessageText = userInput.trim();
    this.messages.update((currentMessages) => [
      ...currentMessages,
      { text: userMessageText, sender: 'user' },
    ]);
    this.form.get('message')?.reset();
    this.isGloballyLoading.set(true);

    const botMessageIndex = this.messages().length;
    this.messages.update((currentMessages) => [
      ...currentMessages,
      { text: '', sender: 'bot', sources: [], isLoading: true },
    ]);

    this.#chatService.sendMessage(userMessageText).subscribe({
      next: (responsePart: StreamedChatResponsePart) => {
        this.messages.update((currentMessages) => {
          const updatedMessages = [...currentMessages];
          const currentBotMessage = updatedMessages[botMessageIndex];

          if (responsePart.type === 'sources') {
            currentBotMessage.sources = responsePart.data;
          } else if (responsePart.type === 'chunk') {
            currentBotMessage.text += responsePart.data;
          } else if (responsePart.type === 'done') {
            currentBotMessage.isLoading = false;
            this.isGloballyLoading.set(false);
          } else if (responsePart.type === 'error') {
            console.error('Error in stream:', responsePart.error);
            currentBotMessage.text =
              'Error: Could not get a streamed response.';
            currentBotMessage.isLoading = false;
            this.isGloballyLoading.set(false);
          }
          return updatedMessages;
        });
      },
      error: (error) => {
        console.error('Error sending message stream:', error);
        this.messages.update((currentMessages) => {
          const updatedMessages = [...currentMessages];
          const currentBotMessage = updatedMessages[botMessageIndex];
          if (currentBotMessage && currentBotMessage.sender === 'bot') {
            currentBotMessage.text =
              'Error: Failed to connect to streaming service.';
            currentBotMessage.isLoading = false;
          } else {
            updatedMessages.push({
              text: 'Error: Failed to connect to streaming service.',
              sender: 'bot',
              isLoading: false,
            });
          }
          return updatedMessages;
        });
        this.isGloballyLoading.set(false);
      },
      complete: () => {
        this.messages.update((currentMessages) => {
          const updatedMessages = [...currentMessages];
          const currentBotMessage = updatedMessages[botMessageIndex];
          if (currentBotMessage && currentBotMessage.isLoading) {
            currentBotMessage.isLoading = false;
          }
          return updatedMessages;
        });

        this.isGloballyLoading.set(false);
      },
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.shiftKey) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.onSendMessage();
    }
  }
}
