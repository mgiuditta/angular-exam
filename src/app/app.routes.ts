import {Routes} from '@angular/router';
import {DisneyCharactersListComponent} from './features/disney/components/disney-characters-list.component';
import {DisneyCharacterDetailsComponent} from './features/disney/components/disney-character-details.component';
import {disneyCharacterResolver} from './features/disney/resolver/disney-character.resolver';

export const routes: Routes = [
  {path: 'disney', component: DisneyCharactersListComponent},
  {path: 'disney/:id', component: DisneyCharacterDetailsComponent, resolve: {character: disneyCharacterResolver}},
  {path: '', redirectTo: '/disney', pathMatch: 'full'},
  {path: '**', redirectTo: '/disney', pathMatch: 'full'},
];
