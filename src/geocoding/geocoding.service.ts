import { Injectable } from "@nestjs/common"
import axios from "axios"

@Injectable()
export class GeocodingService {
  private readonly nominatimUrl = "https://nominatim.openstreetmap.org/search"
  private readonly photonUrl = "https://photon.komoot.io/api"

  // Cache pour éviter de refaire les mêmes requêtes
  private readonly geocodeCache = new Map<string, { lat: number; lng: number }>()

  // Base de données locale avec coordonnées précises pour Sousse
  private readonly sousseLocations = {
    // Adresses spécifiques de Sousse avec coordonnées très précises
    "boulevard du 14 janvier sousse corniche": { lat: 35.8335, lng: 10.638 },
    "boulevard 14 janvier sousse corniche": { lat: 35.8335, lng: 10.638 },
    "corniche sousse": { lat: 35.8335, lng: 10.638 },
    "sousse corniche": { lat: 35.8335, lng: 10.638 },
    "14 janvier sousse": { lat: 35.8335, lng: 10.638 },

    "rue imam abou hanifa khzema est sousse": { lat: 35.828, lng: 10.595 },
    "imam abou hanifa khzema est sousse": { lat: 35.828, lng: 10.595 },
    "khzema est sousse": { lat: 35.828, lng: 10.595 },
    "khezama est sousse": { lat: 35.828, lng: 10.595 },
    "khzema sousse": { lat: 35.828, lng: 10.595 },

    // Autres quartiers de Sousse
    "sahloul sousse": { lat: 35.8484, lng: 10.5986 },
    sahloul: { lat: 35.8484, lng: 10.5986 },
    "hammam sousse": { lat: 35.8611, lng: 10.5944 },
    "port el kantaoui": { lat: 35.8903, lng: 10.5986 },
    kantaoui: { lat: 35.8903, lng: 10.5986 },
    "medina sousse": { lat: 35.8245, lng: 10.6346 },
    "centre ville sousse": { lat: 35.8245, lng: 10.6346 },
    "sousse ville": { lat: 35.8245, lng: 10.6346 },
    sousse: { lat: 35.8245, lng: 10.6346 },
  }

  /**
   * Géocode une adresse avec priorité sur la base locale pour Sousse
   */
  async getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log(`Geocoding address: "${address}"`)

      // Vérifier le cache d'abord
      const cacheKey = address.toLowerCase().trim()
      if (this.geocodeCache.has(cacheKey)) {
       const cachedCoords = this.geocodeCache.get(cacheKey)
if (cachedCoords) {
  console.log(`Using cached coordinates for "${address}":`, cachedCoords)
  return cachedCoords
}
      }

      // Vérifier d'abord dans notre base locale pour Sousse
      const localCoords = this.getLocalSousseCoordinates(address)
      if (localCoords) {
        console.log(`Using local Sousse coordinates for "${address}":`, localCoords)
        this.geocodeCache.set(cacheKey, localCoords)
        return localCoords
      }

      // Nettoyer et formater l'adresse
      const cleanAddress = this.cleanAddressForTunisia(address)
      console.log(`Cleaned address: "${cleanAddress}"`)

      // Essayer Nominatim avec recherche spécifique pour Sousse
      const nominatimCoords = await this.geocodeWithNominatimSousse(cleanAddress)
      if (nominatimCoords && this.isValidSousseCoordinates(nominatimCoords)) {
        this.geocodeCache.set(cacheKey, nominatimCoords)
        return nominatimCoords
      }

      // Essayer Photon
      const photonCoords = await this.geocodeWithPhoton(cleanAddress)
      if (photonCoords && this.isValidSousseCoordinates(photonCoords)) {
        this.geocodeCache.set(cacheKey, photonCoords)
        return photonCoords
      }

      console.log(`No precise geocoding result found for: "${address}"`)
      return null
    } catch (error) {
      const errorMessage = this.getErrorMessage(error)
      console.error(`Erreur lors du géocodage de l'adresse "${address}" : ${errorMessage}`)
      return null
    }
  }

  /**
   * Recherche dans la base locale pour Sousse
   */
  private getLocalSousseCoordinates(address: string): { lat: number; lng: number } | null {
    const lowerAddress = address.toLowerCase().trim()

    // Recherche exacte d'abord
    if (this.sousseLocations[lowerAddress]) {
      return this.sousseLocations[lowerAddress]
    }

    // Recherche par inclusion (plus flexible)
    for (const [key, coords] of Object.entries(this.sousseLocations)) {
      if (lowerAddress.includes(key) || key.includes(lowerAddress)) {
        console.log(`Local match found: "${lowerAddress}" matched with "${key}"`)
        return coords
      }
    }

    // Recherche par mots-clés
    const addressWords = lowerAddress.split(/\s+/)
    for (const [key, coords] of Object.entries(this.sousseLocations)) {
      const keyWords = key.split(/\s+/)
      const matchCount = addressWords.filter((word) =>
        keyWords.some((keyWord) => keyWord.includes(word) || word.includes(keyWord)),
      ).length

      if (matchCount >= 2) {
        // Au moins 2 mots correspondent
        console.log(`Keyword match found: "${lowerAddress}" matched with "${key}" (${matchCount} words)`)
        return coords
      }
    }

    return null
  }

  /**
   * Géocode avec Nominatim spécialement optimisé pour Sousse
   */
  private async geocodeWithNominatimSousse(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log(`Trying Nominatim for Sousse address: "${address}"`)

      // Essayer plusieurs variantes de recherche pour Sousse
      const searchVariants = [`${address}, Sousse, Tunisia`, `${address}, Sousse`, `${address} Sousse Tunisia`, address]

      for (const variant of searchVariants) {
        const response = await axios.get(this.nominatimUrl, {
          params: {
            q: variant,
            format: "json",
            limit: 5,
            countrycodes: "tn",
            addressdetails: 1,
            bounded: 1,
            viewbox: "10.5,35.7,10.7,35.9", // Bounding box pour Sousse
          },
          headers: {
            "User-Agent": "RouteOptimizationApp/1.0 (contact@yourapp.com)",
          },
          timeout: 15000,
        })

        if (response.data && response.data.length > 0) {
          // Filtrer et scorer les résultats pour Sousse
          const sousseResults = response.data.filter((result) => {
            const displayName = result.display_name?.toLowerCase() || ""
            return (
              displayName.includes("sousse") &&
              this.isValidSousseCoordinates({
                lat: Number.parseFloat(result.lat),
                lng: Number.parseFloat(result.lon),
              })
            )
          })

          if (sousseResults.length > 0) {
            const bestResult = this.selectBestSousseResult(sousseResults, address)
            if (bestResult) {
              const coordinates = {
                lat: Number.parseFloat(bestResult.lat),
                lng: Number.parseFloat(bestResult.lon),
              }

              console.log(`Nominatim geocoded "${address}" to:`, coordinates)
              console.log(`Result details:`, bestResult.display_name)
              return coordinates
            }
          }
        }

        // Pause entre les variantes
        await this.sleep(300)
      }

      return null
    } catch (error) {
      console.error(`Nominatim geocoding failed for "${address}":`, this.getErrorMessage(error))
      return null
    }
  }

  /**
   * Sélectionne le meilleur résultat pour Sousse
   */
  private selectBestSousseResult(results: any[], originalAddress: string): any | null {
    if (!results || results.length === 0) return null

    const addressLower = originalAddress.toLowerCase()

    // Scorer chaque résultat
    const scoredResults = results.map((result) => {
      let score = 0
      const displayName = result.display_name?.toLowerCase() || ""

      // Bonus pour le type d'objet
      if (result.type === "house" || result.type === "building") score += 15
      if (result.type === "road" || result.type === "street") score += 12
      if (result.type === "neighbourhood" || result.type === "suburb") score += 8
      if (result.type === "city" || result.type === "town") score += 5

      // Bonus pour la correspondance de mots spécifiques
      if (addressLower.includes("14 janvier") && displayName.includes("14 janvier")) score += 20
      if (addressLower.includes("corniche") && displayName.includes("corniche")) score += 20
      if (addressLower.includes("imam abou hanifa") && displayName.includes("imam")) score += 20
      if (addressLower.includes("khzema") && displayName.includes("khzema")) score += 20

      // Bonus pour la proximité du centre de Sousse
      const sousseCenter = { lat: 35.8245, lng: 10.6346 }
      const distance = this.calculateSimpleDistance(
        { lat: Number.parseFloat(result.lat), lng: Number.parseFloat(result.lon) },
        sousseCenter,
      )

      if (distance < 5000) score += 10 // Moins de 5km du centre
      if (distance < 2000) score += 5 // Moins de 2km du centre

      return { result, score, distance }
    })

    // Trier par score décroissant
    scoredResults.sort((a, b) => b.score - a.score)

    console.log(
      "Scored results for Sousse:",
      scoredResults.map((r) => ({
        score: r.score,
        distance: r.distance,
        name: r.result.display_name,
      })),
    )

    return scoredResults[0]?.result || results[0]
  }

  /**
   * Vérifie si les coordonnées sont valides pour Sousse
   */
  private isValidSousseCoordinates(coords: { lat: number; lng: number }): boolean {
    // Limites précises de la région de Sousse
    const sousseBounds = {
      north: 35.95,
      south: 35.7,
      east: 10.7,
      west: 10.5,
    }

    const isValid =
      coords.lat >= sousseBounds.south &&
      coords.lat <= sousseBounds.north &&
      coords.lng >= sousseBounds.west &&
      coords.lng <= sousseBounds.east

    if (!isValid) {
      console.log(`Coordinates ${coords.lat}, ${coords.lng} are outside Sousse bounds`)
    }

    return isValid
  }

  /**
   * Calcule une distance simple entre deux points
   */
  private calculateSimpleDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371000 // Rayon de la Terre en mètres
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Géocode avec Photon
   */
  private async geocodeWithPhoton(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      console.log(`Trying Photon for "${address}"`)

      const response = await axios.get(this.photonUrl, {
        params: {
          q: `${address}, Sousse, Tunisia`,
          limit: 3,
          bbox: "10.5,35.7,10.7,35.9", // Bounding box pour Sousse
        },
        timeout: 15000,
      })

      if (response.data && response.data.features && response.data.features.length > 0) {
        const bestFeature = response.data.features[0]
        const coordinates = {
          lat: bestFeature.geometry.coordinates[1],
          lng: bestFeature.geometry.coordinates[0],
        }

        if (this.isValidSousseCoordinates(coordinates)) {
          console.log(`Photon geocoded "${address}" to:`, coordinates)
          return coordinates
        }
      }

      return null
    } catch (error) {
      console.error(`Photon geocoding failed for "${address}":`, this.getErrorMessage(error))
      return null
    }
  }

  private cleanAddressForTunisia(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, " ")
      .replace(/,\s*,/g, ",")
      .replace(/^,|,$/g, "")
      .replace(/\bboulevard\b/gi, "boulevard")
      .replace(/\brue\b/gi, "rue")
      .replace(/\bavenue\b/gi, "avenue")
      .replace(/\bbd\b/gi, "boulevard")
  }

  /**
   * Méthode principale avec fallback intelligent pour Sousse
   */
  async getCoordinatesWithFallback(address: string): Promise<{ lat: number; lng: number }> {
    console.log(`Getting coordinates with fallback for: "${address}"`)

    // 1. Essayer le géocodage normal
    const coords = await this.getCoordinates(address)
    if (coords) {
      return coords
    }

    // 2. Si l'adresse contient "sousse", utiliser les coordonnées du centre de Sousse
    if (address.toLowerCase().includes("sousse")) {
      console.log(`Using Sousse center coordinates for "${address}"`)
      return { lat: 35.8245, lng: 10.6346 }
    }

    // 3. Fallback sur Tunis
    console.log(`Using default Tunisia coordinates for "${address}"`)
    return { lat: 36.8065, lng: 10.1815 }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === "string") return error
    return "Erreur inconnue"
  }
}
