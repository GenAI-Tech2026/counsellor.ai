# JEE Main 2025 Data

Official JEE Main 2025 admission data, collected to power the AI counsellor (mirrors the
`tgeamcet/` dataset). Each file is provided in both PDF and (for the rank data) XLSX format.

## Files

### JoSAA Opening & Closing Ranks (analog to EAMCET "last ranks")
Branch-wise opening and closing ranks for **IITs, NITs, IIITs, and GFTIs** admitted through
JoSAA counselling on the basis of JEE Main / JEE Advanced rank. One file per counselling round.

| File | Round | Records |
|------|-------|---------|
| `JEE_JoSAA_2025_Round1_ORCR.{pdf,xlsx}` | Round 1 | 12,275 |
| `JEE_JoSAA_2025_Round2_ORCR.{pdf,xlsx}` | Round 2 | 12,047 |
| `JEE_JoSAA_2025_Round3_ORCR.{pdf,xlsx}` | Round 3 | 11,982 |
| `JEE_JoSAA_2025_Round4_ORCR.{pdf,xlsx}` | Round 4 | 11,974 |
| `JEE_JoSAA_2025_Round5_ORCR.{pdf,xlsx}` | Round 5 | 11,966 |
| `JEE_JoSAA_2025_Round6_Final_ORCR.{pdf,xlsx}` | Round 6 (Final) | 11,945 |
| `JEE_JoSAA_2025_AllRounds_ORCR.xlsx` | All rounds (one sheet/round) | — |

Columns: `Institute, Academic Program Name, Quota, Seat Type, Gender, Opening Rank, Closing Rank`.

**Source:** Official JoSAA archive — https://josaa.admissions.nic.in
(Opening & Closing Rank archive, Year 2025, all institute types / institutes / programs / seat types).

### NTA Qualifying Cutoff
`JEE_Main_2025_Category_Cutoff_NTA_Official.pdf` — official NTA result-declaration notice
containing the category-wise cut-off NTA Scores (percentiles) to qualify for JEE (Advanced) 2025
(UR 93.10, EWS 80.38, OBC-NCL 79.43, SC 61.15, ST 47.90).

**Source:** Official NTA notice — https://jeemain.nta.nic.in (JEE Main 2025 Paper 1 result declaration).

## Notes
- The JoSAA portal exposes opening/closing ranks only through an interactive query tool (no
  single official PDF), so the PDF/XLSX here were generated from that official data, unchanged.
- The NTA cutoff PDF is the official document, downloaded as-is.
