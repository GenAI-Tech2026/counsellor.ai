# AP EAPCET (AP EAMCET) — Engineering Last Ranks

**Counterpart to the `tgeamcet` dataset, for Andhra Pradesh.**

## Files
- `APEAPCET 2022 Last Ranks - MPC Stream.xlsx` — institute × branch × category closing (last) ranks.
- `APEAPCET 2022 Last Rank Details (source).pdf` — the original official document.

## Source
Official AP EAPCET counselling portal (APSCHE / APTOnline):
`https://eapcet-sche.aptonline.in/EAPCET/` → "Last Rank Details" (MPC / Engineering stream).
Original file: `APEAMCET2022LASTRANKDETAILS20230720.pdf`, retrieved via the Internet Archive
(the live portal's newer 2023–2025 files are behind a JS-only download route that could not be fetched).

## Year
**2022** — the most recent year for which the full, official, machine-retrievable engineering
last-rank statement was available. (2023–2025 are published only as JS-gated PDFs on the live portal.)

## Columns
`Inst Code, Institute Name, Place, Region (AU/SV), Dist, College Type (PVT/UNIV), Affiliated To,
Estd, Branch Code, Branch Name`, then closing ranks for each category × gender:
`OC, SC, ST, BC_A, BC_B, BC_C, BC_D, BC_E, EWS` (Boys/Girls), and `College Fee`.

A blank rank cell means no candidate of that category/gender was allotted that branch (mirrors the
source PDF). The rank numbers were verified cell-for-cell against the source.

## Notes / caveats
- AP's category scheme differs from Telangana: **single SC** (no SC_I/II/III split) and an added
  **Region** column (AU = Andhra University area, SV = Sri Venkateswara area).
- ~2% of rows fall back to the institute code for the institute name where the PDF's wrapped
  name line could not be matched; the **rank data for those rows is still accurate**.
- 1,407 branch rows across 276 institutions.

## PU/SW companion (added)
- `APEAPCET 2022 Last Ranks - Private Universities & State-Wide.xlsx` — last ranks for
  Private Universities (PU) and State-Wide (SW) institutions. Source:
  `APEAMCET2022LASTRANKDETAILSPUANDSW20230720.pdf`.
- This file has an extra **Local Area** column (AU / SVU): each branch is split by the
  candidate's local region. `EWS` shows **NA** (not applicable for these institutions),
  exactly as in the source. 95 rows across 14 institutions; verified cell-for-cell.
