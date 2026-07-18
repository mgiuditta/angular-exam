import {inject, Injectable} from '@angular/core';
import DisneyUtils from "../utils/disney.utils";
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {DisneyResponse} from '../models/disney.models';

@Injectable({
  providedIn: 'root',
})
export class DisneyService {
  private readonly disneyUtils = inject(DisneyUtils);
  private readonly http = inject(HttpClient);

  getAllCharacters(): Observable<DisneyResponse> {
    return this.http.get<DisneyResponse>(this.disneyUtils.getAllCharactersEndpoint());
  }

  getCharacterById(id: string): Observable<DisneyResponse> {
    return this.http.get<DisneyResponse>(this.disneyUtils.getOneCharacterEndpoint(id));
  }

}
