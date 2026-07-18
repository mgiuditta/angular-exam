import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'sbu-disney-character-details',
  imports: [],
  template: `
    <p>
      disney-character-details works!
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisneyCharacterDetailsComponent {

}
