# Anomaly Detection Strategy

## Overview

The anomaly detection system identifies problematic orders in the procurement dataset through SQL-based rules executed in a single query. This approach enables sub-second analysis of 50,000+ orders.

## Implemented Anomaly Rules

### Core Rules

| Rule | Condition | Severity Contribution |
|------|-----------|----------------------|
| `price_mismatch` | `ABS(total_price - quantity * unit_price) > 0.01` | Base |
| `inactive_supplier` | `supplier.active = false` | Medium |
| `negative_quantity` | `quantity < 0` | High |
| `timestamp_anomaly` | `updated_at < created_at` | High |

### Extended Rules

| Rule | Condition | Severity Contribution |
|------|-----------|----------------------|
| `price_spike` | `unit_price > product.price * 3` | Medium |
| `after_hours` | `EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 6` | Low |
| `risky_supplier` | Supplier's anomalous order rate > 50% | High |

## Severity Classification

Severity is determined by the combination of detected anomalies:

```
HIGH:
  - negative_quantity present, OR
  - timestamp_anomaly present, OR
  - risky_supplier present, OR
  - 2+ anomaly types detected

MEDIUM:
  - inactive_supplier present, OR
  - price_spike present

LOW:
  - Single anomaly of any other type
```

This tiered approach ensures:
- Data integrity issues (negative quantities, timestamp inconsistencies) are flagged as critical
- Business policy violations (inactive suppliers, price spikes) get appropriate attention
- Minor irregularities (after-hours orders) are tracked but not alarming

## SQL Query Approach

The detection uses a single complex CTE-based query for optimal performance:

```sql
WITH anomalies AS (
  SELECT 
    o.id,
    o.supplier_id,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN ABS(o.total_price - o.quantity * o.unit_price) > 0.01 
           THEN 'price_mismatch' END,
      CASE WHEN s.active = false 
           THEN 'inactive_supplier' END,
      CASE WHEN o.quantity < 0 
           THEN 'negative_quantity' END,
      CASE WHEN o.updated_at < o.created_at 
           THEN 'timestamp_anomaly' END,
      CASE WHEN o.unit_price > p.price * 3 
           THEN 'price_spike' END,
      CASE WHEN EXTRACT(HOUR FROM o.created_at) >= 22 
              OR EXTRACT(HOUR FROM o.created_at) < 6 
           THEN 'after_hours' END
    ], NULL) as anomaly_types
  FROM orders o
  LEFT JOIN suppliers s ON o.supplier_id = s.id
  LEFT JOIN products p ON o.product_id = p.id
),
supplier_risk AS (
  SELECT 
    supplier_id,
    COUNT(*) FILTER (WHERE array_length(anomaly_types, 1) > 0)::float 
      / NULLIF(COUNT(*), 0) as anomaly_rate
  FROM anomalies
  GROUP BY supplier_id
  HAVING COUNT(*) FILTER (WHERE array_length(anomaly_types, 1) > 0)::float 
         / NULLIF(COUNT(*), 0) > 0.5
)
SELECT 
  a.id as order_id,
  CASE 
    WHEN sr.supplier_id IS NOT NULL 
    THEN array_cat(a.anomaly_types, ARRAY['risky_supplier'])
    ELSE a.anomaly_types
  END as anomaly_types,
  CASE
    WHEN 'negative_quantity' = ANY(a.anomaly_types) 
         OR 'timestamp_anomaly' = ANY(a.anomaly_types)
         OR sr.supplier_id IS NOT NULL
         OR array_length(a.anomaly_types, 1) >= 2
    THEN 'high'
    WHEN 'inactive_supplier' = ANY(a.anomaly_types) 
         OR 'price_spike' = ANY(a.anomaly_types)
    THEN 'medium'
    ELSE 'low'
  END as severity
FROM anomalies a
LEFT JOIN supplier_risk sr ON a.supplier_id = sr.supplier_id
WHERE array_length(a.anomaly_types, 1) > 0 OR sr.supplier_id IS NOT NULL
ORDER BY 
  CASE severity 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    ELSE 3 
  END,
  a.id
```

### Performance Characteristics

| Metric | Value |
|--------|-------|
| Dataset Size | 50,000 orders |
| Response Time | < 1000ms (p95) |
| Query Strategy | Single pass with CTEs |
| Index Usage | supplier_id, product_id FKs |

The CTE approach processes all orders in two logical passes:
1. First CTE computes per-order anomalies
2. Second CTE aggregates supplier risk
3. Final SELECT combines results with severity

## Discovered Patterns in Dataset

Analysis of the seed data reveals:

### By Anomaly Type
- **price_mismatch**: Common (~8% of orders) - likely rounding in source data
- **inactive_supplier**: ~15% of suppliers inactive, affecting ~3% of orders
- **negative_quantity**: Rare but present - data entry errors
- **timestamp_anomaly**: Present in edge cases
- **price_spike**: Product prices vary significantly
- **after_hours**: ~25% of orders created in off-hours (22:00-06:00 UTC)

### High-Risk Suppliers
Suppliers with >50% anomalous orders tend to:
- Have many price_mismatch errors (inconsistent pricing)
- Process after-hours orders predominantly
- Show patterns suggesting manual data entry

## Limitations

### False Positives

1. **after_hours**: May be legitimate for international suppliers in different time zones
2. **price_spike**: Could be valid for rush orders or premium variants
3. **risky_supplier**: High anomaly rate might reflect poor data quality, not fraud

### Not Detected

1. **Duplicate orders**: Same order placed multiple times
2. **Quantity outliers**: Unusually large quantities (statistical outliers)
3. **Velocity anomalies**: Sudden spikes in order volume
4. **Geographic mismatches**: Supplier country vs warehouse location
5. **Approval pattern anomalies**: Orders approved too quickly or slowly

### Data Quality Dependencies

The system assumes:
- Product prices are current and accurate
- Supplier active status is maintained
- Timestamps are in UTC

Stale reference data reduces detection accuracy.

## Future Improvements

### Short Term

1. **Statistical Outlier Detection**
   ```sql
   CASE WHEN o.quantity > (
     SELECT AVG(quantity) + 3 * STDDEV(quantity) FROM orders
   ) THEN 'quantity_outlier' END
   ```

2. **Duplicate Detection**
   ```sql
   CASE WHEN EXISTS (
     SELECT 1 FROM orders o2 
     WHERE o2.supplier_id = o.supplier_id 
       AND o2.product_id = o.product_id
       AND o2.quantity = o.quantity
       AND o2.created_at BETWEEN o.created_at - INTERVAL '1 hour' 
                             AND o.created_at + INTERVAL '1 hour'
       AND o2.id != o.id
   ) THEN 'potential_duplicate' END
   ```

3. **Configurable Thresholds**
   - Move magic numbers (3x price, 50% risk rate) to configuration
   - Allow per-category price spike thresholds

### Medium Term

1. **Time-Series Analysis**
   - Detect unusual ordering patterns per supplier
   - Identify seasonal anomalies
   - Flag deviation from historical baselines

2. **Machine Learning Integration**
   - Train classifier on confirmed anomalies
   - Use embeddings for similar-order clustering
   - Anomaly scoring instead of binary classification

3. **Real-Time Detection**
   - Trigger anomaly check on order creation
   - Immediate alerts for high-severity issues
   - Integration with approval workflow

### Long Term

1. **Graph Analysis**
   - Supplier network patterns
   - Product co-purchasing anomalies
   - Circular transaction detection

2. **External Data Integration**
   - Market price feeds for price validation
   - Supplier reputation databases
   - Geographic/logistics validation

## API Response Format

```json
{
  "data": [
    {
      "order_id": "ord_12345",
      "anomaly_types": ["price_mismatch", "inactive_supplier"],
      "severity": "high"
    }
  ]
}
```

Results are sorted by severity (high → medium → low) then by order ID for consistent pagination.

## Operational Recommendations

### Daily Review Process
1. Start with HIGH severity anomalies
2. Group by anomaly type for pattern identification
3. Mark false positives to improve future detection

### Threshold Tuning
- Monitor false positive rate monthly
- Adjust price_spike multiplier based on category
- Review risky_supplier threshold quarterly

### Escalation Matrix
| Severity | Response Time | Action |
|----------|---------------|--------|
| High | Same day | Manual review required |
| Medium | 48 hours | Automated flag, optional review |
| Low | Weekly batch | Log for trend analysis |
