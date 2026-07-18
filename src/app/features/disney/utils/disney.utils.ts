import {Injectable} from "@angular/core"

@Injectable({
  providedIn: 'root',
})
export default class DisneyUtils {

  constructor() {
  }

  getAllCharactersEndpoint(): string {
    return this.DISNEY_ENDPOINTS.getAllCharacters
  }

  filterCharacterEndpoint(): string {
    return this.DISNEY_ENDPOINTS.filterCharacter
  }

  getOneCharacterEndpoint(id: string): string {
    return this.DISNEY_ENDPOINTS.getOneCharacter
  }

  private readonly DISNEY_ENDPOINTS = {
    getAllCharacters: `${this.baseUrl}/character`,
    filterCharacter: `${this.baseUrl}/character?queryParams`,
    getOneCharacter: `${this.baseUrl}/character/:id`
  }

  private get baseUrl(): string {
    return "https://api.disneyapi.dev"
  }

}


