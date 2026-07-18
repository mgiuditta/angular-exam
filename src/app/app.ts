import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <sbu-header />
    <router-outlet></router-outlet>
  `
})
export class App {
  protected readonly title = signal('angular-exam');
}
