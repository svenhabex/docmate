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
      ? 'px-5 py-4 rounded-4xl ml-auto bg-surface-800'
      : 'mr-auto bg-transparent';
  });
}
