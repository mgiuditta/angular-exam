export interface DisneyResponse {
  info: Info
  data: Character[]
}

export interface Info {
  totalPages: number
  count: number
  previousPage: string
  nextPage: string
}

export interface Character {
  _id: number
  films: string[]
  shortFilms: string[]
  tvShows: string[]
  videoGames: string[]
  parkAttractions: string[]
  allies: any[]
  enemies: any[]
  sourceUrl: string
  name: string
  imageUrl: string
  createdAt: string
  updatedAt: string
  url: string
  __v: number
}
