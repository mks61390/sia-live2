# Apify — Yad2 Scraper Actor Configuration

## Actor

Use the community actor **"Yad2 Real Estate Scraper"** (search in the Apify Store for `yad2`).
Recommended actor: `maxcopell/yad2-scraper` or the most-starred Yad2 actor available.

## Input configuration

Paste the following JSON into the actor's **Input** tab before running:

```json
{
  "searchUrl": "https://www.yad2.co.il/realestate/rent?city=5000&rooms=-1-6&price=2000-30000",
  "maxItems": 500,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

### Search URL parameters explained

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `city` | `5000` | Tel Aviv |
| `rooms` | `-1-6` | All room counts (studios through 6-room) |
| `price` | `2000-30000` | NIS monthly rent range |

To add **Greater Tel Aviv** run a second scrape with city codes:
- `5270` — Ramat Gan
- `6300` — Petah Tikva
- `7900` — Rishon LeZion
- `8600` — Holon
- `6200` — Bnei Brak

## Output schema (per item)

The actor returns an array of objects. The fields we care about:

| Actor field | Maps to `listings` column |
|-------------|--------------------------|
| `id` | `source_id` |
| `url` | `source_url` |
| `title` | `title` |
| `description` | `description` |
| `price` | `price` |
| `rooms` | `bedrooms` |
| `squareMeter` | `area_sqm` |
| `coordinates.lat` | `lat` |
| `coordinates.lng` | `lng` |
| `neighborhood` | `neighborhood` |
| `images[]` | `photos` (array of URLs) |
| `publishedAt` | `published_at` |

Set `source = "yad2"` for every row.

## Storing your API key

After creating your Apify account, copy your API token from **Settings → Integrations → API tokens**.

Store it in n8n as a credential named **"Apify API"** (type: Header Auth, header name: `Authorization`, value: `Bearer <your-token>`).

Never commit the token to this repository.

## Running the actor via API

n8n triggers the actor with a POST request:

```
POST https://api.apify.com/v2/acts/<actor-id>/runs
Authorization: Bearer <APIFY_API_TOKEN>
Content-Type: application/json

{ "searchUrl": "...", "maxItems": 500, ... }
```

Response contains `data.id` (the run ID). Poll `GET /v2/acts/<actor-id>/runs/<run-id>` until `status === "SUCCEEDED"`, then fetch results from `GET /v2/datasets/<defaultDatasetId>/items`.

The n8n workflow handles all of this — see `n8n-workflow.json`.
