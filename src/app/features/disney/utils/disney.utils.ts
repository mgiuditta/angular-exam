import {Injectable} from "@angular/core"

@Injectable({
  providedIn: 'root',
})
export default class DisneyUtils {

  getAllCharactersEndpoint(): string {
    return this.DISNEY_ENDPOINTS.getAllCharacters
  }

  filterCharacterEndpoint(name: string): string {
    return this.DISNEY_ENDPOINTS.filterCharacter.replace(':name', encodeURIComponent(name))
  }

  getOneCharacterEndpoint(id: string): string {
    return this.DISNEY_ENDPOINTS.getOneCharacter.replace(':id', id)
  }

  private readonly DISNEY_ENDPOINTS = {
    getAllCharacters: `${this.baseUrl}/character`,
    filterCharacter: `${this.baseUrl}/character?name=:name`,
    getOneCharacter: `${this.baseUrl}/character/:id`
  }

  private get baseUrl(): string {
    return "https://api.disneyapi.dev"
  }

}


