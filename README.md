# RuffleButts Virtual Studio

Internal AI photography studio UI.

## Setup

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.local.example` to `.env.local` and fill in your n8n webhook URLs:
   ```
   cp .env.local.example .env.local
   ```
4. Run locally:
   ```
   npm run dev
   ```
5. Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables in Vercel project settings
4. Deploy

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_N8N_FLAT_WEBHOOK` | n8n webhook URL for flat product shots |

## Adding More Workflows

As each n8n workflow is completed, add its webhook URL as an environment variable and build the corresponding form component.
