import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DemoSession } from './demo-session';

/** Destinazione del redirect delle guard. `returnUrl` arriva come query param → input. */
@Component({
  selector: 'sbu-login-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="text-base font-semibold">Login richiesto</h3>
    <p class="text-sm">
      returnUrl: <code>{{ returnUrl() ?? 'nessuno' }}</code>
    </p>
    <button type="button" class="btn mt-2" (click)="login()">Accedi e torna indietro</button>
  `,
})
export class LoginDemo {
  readonly returnUrl = input<string>();

  private readonly session = inject(DemoSession);
  private readonly router = inject(Router);

  protected login(): void {
    this.session.loggedIn.set(true);
    // navigateByUrl: l'URL è già completo (assoluto), niente comandi né relativeTo
    void this.router.navigateByUrl(this.returnUrl() ?? '/routing');
  }
}
