import { AvailabilityProvider, ProviderVenue } from "./types"
import { StudioAxProvider } from "./studioax"
import { AlleyoopProvider } from "./alleyoop"
import { Studio1000Provider } from "./studio1000"
import { BuzzProvider } from "./buzz"
import { SproutProvider } from "./sprout"

const PROVIDERS: AvailabilityProvider[] = [
  new StudioAxProvider(),
  new AlleyoopProvider(),
  new Studio1000Provider(),
  new BuzzProvider(),
  new SproutProvider(),
]

export async function fetchAllAvailability(date: string): Promise<{
  venues: ProviderVenue[]
  errors: { providerId: string; message: string }[]
}> {
  const results = await Promise.allSettled(
    PROVIDERS.map((p) => p.fetchAvailability(date))
  )

  const venues: ProviderVenue[] = []
  const errors: { providerId: string; message: string }[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === "fulfilled") {
      venues.push(...result.value)
    } else {
      const providerId = PROVIDERS[i].providerId
      const message = String(result.reason)
      console.error(`Provider error [${providerId}]:`, result.reason)
      errors.push({ providerId, message })
    }
  }
  return { venues, errors }
}
