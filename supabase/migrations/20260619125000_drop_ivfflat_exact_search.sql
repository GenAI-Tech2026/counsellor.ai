-- Drop the IVFFlat ANN index in favour of exact (sequential) cosine search.
--
-- With only ~2,820 rows, an exact scan is sub-millisecond AND always correct.
-- IVFFlat only probes a subset of clusters (probes=1 by default), which caused
-- recall to collapse to zero once the rank-eligibility WHERE filter was applied
-- (the probed cluster often held no eligible rows). Exact search avoids that.
--
-- If this table ever grows to tens of thousands of rows, re-introduce an ANN
-- index (IVFFlat with more `lists` + `set ivfflat.probes`, or HNSW) and tune it
-- AFTER the data is loaded.

drop index if exists tgeapcet_2025_embedding_idx;
