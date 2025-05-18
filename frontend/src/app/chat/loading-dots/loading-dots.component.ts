import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loading-dots',
  templateUrl: 'loading-dots.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingDotsComponent {}
