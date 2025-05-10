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
})
export class MessageBubbleComponent {
  readonly content = input.required<string>();
  readonly type = input.required<MessageType>();

  readonly backgroundClass = computed(() => {
    return this.type() === 'sent' ? 'bg-primary' : 'bg-surface-900';
  });
}
