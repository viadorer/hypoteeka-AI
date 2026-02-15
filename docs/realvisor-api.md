# RealVisor Public API — Quick Reference

## Base URL
```
https://api-production-88cf.up.railway.app/api/v1/public/api-leads
```

## Endpoints
- POST /submit — Create lead
- GET /geocode — Address validation + GPS
- POST /valuo — Property valuation
- GET /valuo — List valuations
- GET /valuo/:valuationId — Valuation detail

## POST /valuo — Required fields

### Always required:
firstName, lastName, email, kind (sale/lease), propertyType (flat/house/land), address, lat, lng

### By property type:
- flat: floorArea, rating
- house: floorArea, lotArea, rating
- land: lotArea

### Optional (improve accuracy):
localType, ownership, construction, houseType, landType, floor, totalFloors, elevator,
energyPerformance, rooms, bedrooms, bathrooms, kitchens, garages, parkingSpaces,
cellarArea, balconyArea, terraceArea, gardenArea, loggiaArea, atticArea, otherArea,
builtUpArea, equipment, easyAccess, street, streetNumber, city, district, region, postalCode

### Enums:
- rating: bad, nothing_much, good, very_good, new, excellent
- ownership: private, cooperative, council, other
- construction: brick, panel, wood, stone, montage, mixed, other
- houseType: family_house, villa, cottage, hut, other
- landType: building, garden, field, meadow, forest, other

## Response includes:
contact, property, cadastre (RUIAN), valuation, valuoRequest, valuoRawResponse, enrichment, emailSent
