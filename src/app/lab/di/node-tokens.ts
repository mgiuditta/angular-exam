import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  HostAttributeToken,
  ViewContainerRef,
  inject,
} from '@angular/core';

/**
 * ESEMPIO 10 — Token che esistono SOLO nei node injector
 *
 * ElementRef, ViewContainerRef, ChangeDetectorRef, TemplateRef, Renderer2, HostAttributeToken
 * descrivono "il nodo in cui mi trovo": un servizio providedIn root non ha un nodo → non può
 * iniettarli (NullInjectorError). DestroyRef invece esiste ovunque (nodo o environment).
 *
 * `HostAttributeToken('variant')`: legge l'attributo STATICO dell'host una volta sola, alla
 * creazione. Non è un input: non è reattivo e non vede i binding `[attr.variant]`.
 */
@Component({
  selector: 'sbu-di-node-tokens',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>inject(new HostAttributeToken('variant'))</dt>
      <dd><code>{{ variant ?? 'null' }}</code></dd>
      <dt>inject(ElementRef).nativeElement</dt>
      <dd><code>{{ tagName }}</code></dd>
      <dt>ViewContainerRef ancorato all'host</dt>
      <dd>{{ anchoredOnHost }}</dd>
      <dt>EnvironmentInjector.get(ElementRef, null)</dt>
      <dd><code>{{ elementRefFromEnvironment ?? 'null' }}</code></dd>
    </dl>
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="updateLater(false)">setTimeout senza markForCheck</button>
      <button type="button" class="btn" (click)="updateLater(true)">setTimeout + markForCheck()</button>
    </div>
    <p class="mt-2 text-sm" aria-live="polite">Campo NON signal: aggiornamenti = {{ plainUpdates }}</p>
  `,
})
export class NodeTokens {
  protected readonly variant = inject(new HostAttributeToken('variant'), { optional: true });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly tagName = this.host.nativeElement.tagName.toLowerCase();
  protected readonly anchoredOnHost =
    inject(ViewContainerRef).element.nativeElement === this.host.nativeElement;
  protected readonly elementRefFromEnvironment = inject(EnvironmentInjector).get(ElementRef, null);

  private readonly cdr = inject(ChangeDetectorRef);
  protected plainUpdates = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /**
   * App zoneless: un setTimeout NON avvia il change detection. Il campo cambia ma lo schermo no,
   * finché qualcuno non chiama markForCheck() (o arriva un altro evento/signal).
   */
  protected updateLater(markForCheck: boolean): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.plainUpdates++;
      if (markForCheck) this.cdr.markForCheck();
    }, 300);
  }
}
