import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  ChatService,
  StreamedChatResponsePart,
  Source,
  MessageSender,
} from './chat.service';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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

  form = new FormGroup({ message: new FormControl('', [Validators.required]) });
  messages = signal<
    Array<{
      text: string;
      sender: MessageSender;
      sources?: Source[];
      isLoading?: boolean;
    }>
  >([]);
  isGloballyLoading = signal(false);

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && event.shiftKey) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.onSendMessage();
    }
  }

  async onSendMessage() {
    const messageControl = this.form.get('message');
    this.form.markAsTouched();
    if (this.form.invalid || !messageControl?.value) {
      return;
    }

    const userMessageText = messageControl?.value.trim();

    this.displayUserMessage(userMessageText);
    const assistantMessageIndex = this.prepareForAssistantResponse();

    this.#chatService.sendMessage(userMessageText).subscribe({
      next: (part) => this.handleStreamPart(part, assistantMessageIndex),
      error: (error) => this.handleStreamError(error, assistantMessageIndex),
      complete: () => this.handleStreamComplete(assistantMessageIndex),
    });
  }

  private displayUserMessage(text: string) {
    this.messages.update((currentMessages) => [
      ...currentMessages,
      { text, sender: 'user' },
    ]);
  }

  private prepareForAssistantResponse(): number {
    this.form.get('message')?.reset();
    this.isGloballyLoading.set(true);

    const assistantMessageIndex = this.messages().length;
    this.messages.update((currentMessages) => [
      ...currentMessages,
      { text: '', sender: 'assistant', sources: [], isLoading: true },
    ]);

    return assistantMessageIndex;
  }

  private handleStreamPart(
    responsePart: StreamedChatResponsePart,
    assistantMessageIndex: number
  ): void {
    this.messages.update((currentMessages) => {
      const updatedMessages = [...currentMessages];
      if (
        assistantMessageIndex >= updatedMessages.length ||
        updatedMessages[assistantMessageIndex].sender !== 'assistant'
      ) {
        console.error(
          'Assistant message not found at expected index or type mismatch.'
        );
        if (responsePart.type === 'error' || responsePart.type === 'done') {
          this.isGloballyLoading.set(false);
        }

        return updatedMessages;
      }

      const currentAssistantMessage = updatedMessages[assistantMessageIndex];

      switch (responsePart.type) {
        case 'sources':
          currentAssistantMessage.sources = responsePart.data;
          break;
        case 'chunk':
          currentAssistantMessage.text += responsePart.data;
          break;
        case 'done':
          currentAssistantMessage.isLoading = false;
          this.isGloballyLoading.set(false);
          break;
        case 'error':
          console.error('Error in stream part:', responsePart.error);
          currentAssistantMessage.text =
            'Error: Could not get a streamed response.';
          currentAssistantMessage.isLoading = false;
          this.isGloballyLoading.set(false);
          break;
      }

      return updatedMessages;
    });
  }

  private handleStreamError(
    error: string,
    assistantMessageIndex: number
  ): void {
    console.error('Error sending message stream:', error);
    this.messages.update((currentMessages) => {
      const updatedMessages = [...currentMessages];

      if (
        assistantMessageIndex < updatedMessages.length &&
        updatedMessages[assistantMessageIndex]?.sender === 'assistant'
      ) {
        const currentAssistantMessage = updatedMessages[assistantMessageIndex];
        currentAssistantMessage.text =
          'Error: Failed to connect to streaming service.';
        currentAssistantMessage.isLoading = false;
      } else {
        updatedMessages.push({
          text: 'Error: Failed to connect to streaming service.',
          sender: 'assistant',
          isLoading: false,
        });
      }

      return updatedMessages;
    });

    this.isGloballyLoading.set(false);
  }

  private handleStreamComplete(assistantMessageIndex: number): void {
    this.messages.update((currentMessages) => {
      const updatedMessages = [...currentMessages];
      if (
        assistantMessageIndex < updatedMessages.length &&
        updatedMessages[assistantMessageIndex]?.sender === 'assistant'
      ) {
        const currentAssistantMessage = updatedMessages[assistantMessageIndex];
        if (currentAssistantMessage.isLoading) {
          currentAssistantMessage.isLoading = false;
        }
      }

      return updatedMessages;
    });

    this.isGloballyLoading.set(false);
  }
}
