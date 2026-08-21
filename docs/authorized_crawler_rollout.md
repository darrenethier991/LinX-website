# LINX Authorized Crawler Rollout

## Purpose

LINX uses a layered intake model. Manual and CSV intake, plus approved API, RSS, and owned-feed sources, run through the D1-backed Phase 1 Lead Pipeline. A separate dedicated crawler is reserved for sources that require page rendering or HTML extraction. It is not active merely because a source record exists.

## Source Admission Gate

Before any source may enter the dedicated-crawler queue, the administrator must record the source in the Lead Pipeline workspace and satisfy every condition below.

| Requirement | Required evidence | Result when absent |
|---|---|---|
| Access method | Source is marked `html_crawl` | Source remains manual-only or approved-feed-only. |
| Owner authorization | Contract, documented terms, or written permission recorded by the operator | Source cannot be scheduled. |
| Robots authorization | The operator has confirmed that the relevant paths and use case are allowed | Source cannot be scheduled. |
| Approval | Source status is explicitly marked `approved` | Source cannot be scheduled. |
| Operations | Owner contact, rate cap, concurrency cap, and permitted crawl window are recorded | Source cannot be scheduled. |
| Data scope | Collection is limited to job/lead information needed for the marketplace workflow | Source cannot be scheduled. |

## Dedicated Service Contract

The Phase 2 service will receive only approved source jobs. Each job contains a source identifier, authorized start URL, page cap, permitted window, and source-specific extractor configuration. It must enforce per-domain request caps, low concurrency, exponential backoff, error-rate circuit breaking, and a stop path using the recorded source-owner contact.

The service must normalize successful extractions into the existing LINX lead fields and submit them through the same D1 deduplication and import-audit flow as manual and approved-feed intake. It must not collect login-protected material, bypass access controls, or run a source that is not approved.

## Operational Health

The Lead Pipeline workspace should show the last run, last status, new leads, duplicates, validation failures, source-level errors, and any blocked-source reason. A crawl that exceeds its configured error threshold must halt automatically until an administrator reviews the source record.

## Activation Inputs Still Required

To activate the dedicated service, the operator must provide the first authorized source names and their written/contractual permission status, robots authorization, approved start URLs, field-extraction rules, page caps, rate limits, and preferred operation window. The hosting environment must be selected before deployment because an HTML-rendering crawler needs a persistent service with its own availability, rate limits, and monitoring.
