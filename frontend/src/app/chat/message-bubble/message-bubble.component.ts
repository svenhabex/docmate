import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type MessageType = 'sent' | 'received';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex' },
})
export class MessageBubbleComponent {
  readonly content = input.required<string>();
  readonly type = input.required<MessageType>();

  readonly typeClasses = computed(() => {
    return this.type() === 'sent'
      ? 'ml-auto bg-primary'
      : 'mr-auto bg-surface-700';
  });
}
