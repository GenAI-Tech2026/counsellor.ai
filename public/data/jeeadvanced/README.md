# JEE Advanced 2025 — IIT Opening & Closing Ranks

Counterpart to the `tgeamcet/` / `apeamcet/` "last ranks" datasets, for the **IITs**.
IIT seats are filled only through JEE Advanced ranks (via JoSAA counselling); these are the
JEE Advanced admission closing ranks for every IIT, branch, category, quota and gender pool.

## Source — fetched live from the OFFICIAL JoSAA tool
Scraped directly from the official JoSAA Opening & Closing Rank archive:
`https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchieve.aspx`
(Year 2025, Institute Type = Indian Institute of Technology, every institute / branch / seat type),
using an automated browser session. JoSAA exposes OR-CR only through this interactive tool — there
is no official PDF/Excel — so the data was read from the live result tables, round by round.

**Completeness verified:** every institute's scraped row count was checked against the known
official totals and any short pull was auto-retried until exact. All 6 rounds match exactly
(spot-checked: IIT Bombay CSE OPEN Gender-Neutral closing rank 66, IIT Madras CSE 171).

## Files
| File | Round | IIT records |
|------|-------|-------------|
| `JEE_Advanced_2025_Round1_IIT_ORCR.xlsx` | Round 1 | 3,144 |
| `JEE_Advanced_2025_Round2_IIT_ORCR.xlsx` | Round 2 | 3,120 |
| `JEE_Advanced_2025_Round3_IIT_ORCR.xlsx` | Round 3 | 3,120 |
| `JEE_Advanced_2025_Round4_IIT_ORCR.xlsx` | Round 4 | 3,120 |
| `JEE_Advanced_2025_Round5_IIT_ORCR.xlsx` | Round 5 | 3,118 |
| `JEE_Advanced_2025_Round6_Final_IIT_ORCR.xlsx` | Round 6 (Final) | 3,115 |
| `JEE_Advanced_2025_AllRounds_IIT_ORCR.xlsx` | all rounds (one sheet/round) | 18,737 |

All **23 IITs** covered. The Final round closing rank is the definitive last rank for each seat.

## Columns
`Institute, Academic Program Name, Quota, Seat Type, Gender, Opening Rank, Closing Rank`
- Quota: AI = All India (HS/OS for a few IITs). Seat Type: OPEN, EWS, OBC-NCL, SC, ST + PwD variants.
- Gender: Gender-Neutral or Female-only (incl. Supernumerary). Ranks are JEE Advanced category ranks.

## Note
jeeadv.ac.in itself publishes only qualifying cut-off marks/ranks, not college-wise closing ranks;
the college/branch closing ranks for IITs are published by JoSAA — the official source used here.
