# trading-strategy-ui

Frontend UI for the Trading Strategy Platform.

## Live environments

| Environment | App | API | Branch |
|---|---|---|---|
| **Production** | https://trading.zemingzhang.com | https://api.zemingzhang.com | `main` |
| Staging | https://trading-stg.zemingzhang.com | https://api-stg.zemingzhang.com | `staging` |
| Dev | https://trading-dev.zemingzhang.com | https://api-dev.zemingzhang.com | `dev` |

Each long-lived branch auto-deploys its own environment on push. `feature/*`
branches are never deployed — test those locally with `docker compose up`.

### Repositories

- [trading-strategy-platform](https://github.com/ZMZ-commits/trading-strategy-platform) — infrastructure, deployment, cross-repo docs
- [trading-strategy-ui](https://github.com/ZMZ-commits/trading-strategy-ui) — React front end
- [trading-strategy-backend](https://github.com/ZMZ-commits/trading-strategy-backend) — FastAPI service
- [trading-strategy-engine](https://github.com/ZMZ-commits/trading-strategy-engine) — strategy SDK and sandbox worker
- [trading-strategy-data-pipeline](https://github.com/ZMZ-commits/trading-strategy-data-pipeline) — market data ingestion

## Structure

```
trading-strategy-ui/
├── src/
│   ├── components/
│   ├── pages/
│   └── assets/
└── public/
```

## Getting Started

```bash
npm install
npm run dev
```
