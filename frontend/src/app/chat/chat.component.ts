import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ChatService, ChatResponse } from './chat.service';
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
  messages: Array<{
    text: string;
    sender: 'user' | 'bot';
    sources?: unknown[];
  }> = [];
  isLoading = signal(false);

  async onSendMessage() {
    const userInput = this.form.get('message')?.value;
    if (!userInput) return;

    if (!userInput.trim()) return;

    const userMessage = userInput;
    this.messages.push({ text: userMessage, sender: 'user' });
    this.form.get('message')?.reset();
    this.isLoading.set(true);

    try {
      this.#chatService.sendMessage(userMessage).subscribe({
        next: (response: ChatResponse) => {
          this.messages.push({
            text: response.answer,
            sender: 'bot',
            sources: response.sources,
          });
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.messages.push({
            text: 'Error: Could not get a response.',
            sender: 'bot',
          });
          this.isLoading.set(false);
        },
      });
    } catch (error) {
      console.error('Error in onSendMessage:', error);
      this.messages.push({ text: 'Client-side error.', sender: 'bot' });
      this.isLoading.set(false);
    }
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
