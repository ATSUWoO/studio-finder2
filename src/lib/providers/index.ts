import { AvailabilityProvider, ProviderVenue } from "./types"
import { StudioAxProvider } from "./studioax"
import { AlleyoopProvider } from "./alleyoop"
import { Studio1000Provider } from "./studio1000"

const PROVIDERS: AvailabilityProvider[] = [
  new StudioAxProvider(),
  new AlleyoopProvider(),
  new Studio1000Provider(),
]

export async function fetchAllAvailability(date: string): Promise<ProviderVenue[]> {
  const results = await Promise.allSettled(
    PROVIDERS.map((p) => p.fetchAvailability(date))
  )

  const venues: ProviderVenue[] = []
  for (const result of results) {
    if (result.status === "fulfilled") {
      venues.push(...result.value)
    } else {
      console.error("Provider error:", result.reason)
    }
  }
  return venues
}
