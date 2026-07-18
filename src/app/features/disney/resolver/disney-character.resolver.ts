import {RedirectCommand, ResolveFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {catchError, map, of} from 'rxjs';
import {Character} from '../models/disney.models';
import {DisneyService} from '../service/disney.service';

export const disneyCharacterResolver: ResolveFn<Character | RedirectCommand> = route => {
  const disney = inject(DisneyService);
  const backToList = new RedirectCommand(inject(Router).parseUrl('/disney'));

  const id: string | null = route.paramMap.get('id');
  if (!id) {
    return backToList;
  }

  return disney.getCharacterById(id)
    .pipe(
      map(({data}) => (Array.isArray(data) ? data[0] : data) ?? backToList),
      catchError(() => of(backToList)),
    );
};
