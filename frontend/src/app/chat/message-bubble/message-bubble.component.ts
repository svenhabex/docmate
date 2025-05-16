import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MessageSender, MessageSenderEnum } from '../chat.types';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex' },
})
export class MessageBubbleComponent {
  readonly content = input.required<string>();
  readonly type = input.required<MessageSender>();

  readonly typeClasses = computed(() => {
    return this.type() === MessageSenderEnum.User
      ? 'ml-auto bg-primary-500'
      : 'mr-auto bg-surface-700';
  });
}
