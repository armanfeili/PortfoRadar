# MongoDB Console Reference

Useful `mongosh` one-liners for inspecting and debugging PortfoRadar data.

## Connecting

```bash
# Local MongoDB
mongosh portfolioradar

# Docker Compose
docker compose exec mongo mongosh portfolioradar

# MongoDB Atlas
mongosh "mongodb+srv://cluster.mongodb.net/portfolioradar" --username <user>
```

## Quick Health Checks

```bash
# Total document count
db.companies.countDocuments()

# Uniqueness verification
db.companies.aggregate([
  { $group: { _id: null, docs: { $sum: 1 }, uniqueIds: { $addToSet: "$companyId" }, uniqueNames: { $addToSet: "$name" } } },
  { $project: { _id: 0, docs: 1, uniqueIds: { $size: "$uniqueIds" }, uniqueNames: { $size: "$uniqueNames" } } }
])

# Check for missing required fields
db.companies.countDocuments({ $or: [
  { name: { $exists: false } },
  { assetClasses: { $size: 0 } },
  { industry: { $exists: false } },
  { region: { $exists: false } }
]})
```

## Browsing Data

```bash
# List first 5 companies (sorted by name)
db.companies.find({}, { companyId: 1, name: 1, industry: 1, region: 1 }).sort({ nameSort: 1 }).limit(5).pretty()

# Find a specific company
db.companies.findOne({ name: /acme/i })

# Find by companyId
db.companies.findOne({ companyId: "abc123..." })
```

## Filtering

```bash
# Companies in a specific asset class
db.companies.find({ assetClasses: "Private Equity" }).count()

# Companies by region
db.companies.find({ region: "Americas" }).count()

# Companies by industry
db.companies.find({ industry: "Technology" }).count()

# Search by name (case-insensitive)
db.companies.find({ name: { $regex: "tech", $options: "i" } }, { name: 1, industry: 1 })

# Multi-asset-class companies
db.companies.find({ "assetClasses.1": { $exists: true } }, { name: 1, assetClasses: 1 })
```

## Aggregation & Statistics

```bash
# Count by asset class
db.companies.aggregate([
  { $unwind: "$assetClasses" },
  { $group: { _id: "$assetClasses", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

# Count by region
db.companies.aggregate([
  { $group: { _id: "$region", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

# Count by industry (top 10)
db.companies.aggregate([
  { $group: { _id: "$industry", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])

# Year of investment distribution
db.companies.aggregate([
  { $group: { _id: "$yearOfInvestment", count: { $sum: 1 } } },
  { $sort: { _id: -1 } }
])
```

## Ingestion Runs

```bash
# View latest ingestion run
db.ingestionruns.find().sort({ startedAt: -1 }).limit(1).pretty()

# Ingestion history (last 5 runs)
db.ingestionruns.find({}, { runId: 1, status: 1, startedAt: 1, counts: 1 }).sort({ startedAt: -1 }).limit(5)

# Check for failed runs
db.ingestionruns.find({ status: "failed" }).pretty()
```

## Index Information

```bash
# List all indexes on companies collection
db.companies.getIndexes()

# Index sizes
db.companies.stats().indexSizes
```

## Data Cleanup (Use with Caution)

```bash
# Drop all companies (for re-ingestion)
db.companies.deleteMany({})

# Drop ingestion history
db.ingestionruns.deleteMany({})

# Drop entire database
db.dropDatabase()
```
