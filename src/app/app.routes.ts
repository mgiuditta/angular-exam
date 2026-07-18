import {Routes} from '@angular/router';
import {DisneyCharactersListComponent} from './features/disney/components/disney-characters-list.component';

export const routes: Routes = [
  {path: 'disney', component: DisneyCharactersListComponent},
  {path: '', redirectTo: '/disney', pathMatch: 'full'},
];
