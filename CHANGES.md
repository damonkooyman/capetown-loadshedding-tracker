# Changes Compared to Phase 1 Proposal

This file records every difference between the Phase 1 conceptual design and the
final application, and the reason for each change. Steps not listed here
followed the Phase 1 proposal.

| Step | Change | Reason |
|------|--------|--------|
| 3    | Clarification: the load shedding schedule is simulated sample data stored in SQLite, not official City of Cape Town data | Avoids depending on an external API, so the app runs reliably for anyone who installs it |
| 6    | Addition: the status route also returns an "active outage" flag for power and water, set when an area receives 3 or more reports of that type within the last hour | Phase 1 aimed to give a crowd-verified picture of conditions. This turns individual reports into a clear signal for other users, and gives the back-end real logic beyond storing and listing data |