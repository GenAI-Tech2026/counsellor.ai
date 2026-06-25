# WBJEE 2025 — Engineering / Pharmacy / Architecture Cut-Off Ranks (West Bengal)

Counterpart to the `kcet/`, `mhtcet/`, `apeamcet/`, `tgeamcet/`, `jeeadvanced/` cutoff datasets,
for West Bengal's centralised e-Counselling run by the **West Bengal Joint Entrance Examinations
Board (WBJEEB)**.

## Source — official WBJEEB / NIC e-Counselling portal
Unlike most states, **WBJEEB does not publish a cut-off PDF.** The only official source of
college-wise opening/closing ranks is the NIC e-Counselling **OR-CR** tool:

`https://admissions.nic.in/admiss/admissions/orcrjacd/134112521`  ("WBJEE Counselling 2025")

That Angular tool calls a single official web service that returns the **entire** dataset (every
round, institute, programme and category) in one response:

```
GET https://admissions.nic.in/aisheapi/apisaishe/api/cmsservice.asmx/getConfiguredORCRInfo?boardId=134112521
    headers: authtoken: 1111   clientid: 2222
```

The exact JSON returned by that endpoint is preserved verbatim in
`source/WBJEE_2025_ORCR_official.json` (this is the "source" artifact, in place of a source PDF).
`source/fetch_orcr.py` re-downloads it from the official endpoint.

## Files
| File | Round | Rows | Institutes |
|------|-------|------|-----------|
| `WBJEE_2025_ENGG_Round1_CutOff.xlsx` | Round 1 | 1,897 | 119 |
| `WBJEE_2025_ENGG_Round2_CutOff.xlsx` | Round 2 | 1,123 | 100 |
| `WBJEE_2025_ENGG_AllRounds_CutOff.xlsx` | both rounds (one sheet/round) | 3,020 | — |

WBJEE 2025 e-Counselling published OR-CR for **two rounds**. Row counts fall in Round 2 because
fewer college-programme-category seats remain unfilled/allotted.

## Format (tidy / long)
One row per **Institute × Program × Stream × Seat Type × Quota × Category**, with columns:
`Institute, Program, Stream, Seat Type, Quota, Category, Opening Rank, Closing Rank`.

- **Opening / Closing Rank** are the official ranks for that institute-programme-category in that
  round. Per the source header: *"All ranks are All India CRL / GMR / PMR Rank."*
- **Seat Type** = `WBJEE Seats` (filled from the WBJEE merit list) or `JEE(Main) Seats` (filled
  from the JEE Main merit list — used for B.Arch and the JEE-Main quota).
- **Quota** = `Home State` (West Bengal domicile) or `All India`.
- **Stream** = `B.E/B.Tech (WBJEE/JEE(Main) Seats)/B.Arch (WBJEE Seats)`, `B. Pharma`, or
  `B. Arch (JEE(Main) Seats)`.
- **Category** codes (WBJEEB scheme): `Open`, `EWS`, `OBC - A`, `OBC - B`, `SC`, `ST`,
  `Tuition Fee Waiver`, plus the `… (PwD)` variants (Persons with Disability).

A long/tidy layout is used (instead of one column per category) so each institute-programme lists
only the categories it actually filled — mirroring the source exactly, with no blank-cell guesswork.

## Accuracy
Built directly from the official JSON — no PDF text-layer parsing, so there is nothing to misread.
Validated against the source: all **3,020** rows preserved, every Opening/Closing Rank is a clean
integer (**0 malformed ranks**), and **0** rows have Opening Rank > Closing Rank.

The builder is kept here for reproducibility: `source/fetch_orcr.py` (re-download) then
`build_xlsx.py` (re-run `python3 build_xlsx.py` from this directory).
