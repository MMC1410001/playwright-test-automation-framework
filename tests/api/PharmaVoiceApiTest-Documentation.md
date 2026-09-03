# Pharma Voice API Test Documentation

## Overview

This document describes the **final Playwright API automation test suite** for the **Pharma Voice platform**.

The suite validates:
- Transcript lifecycle
- Audio upload & transcription
- Summary regeneration with version limits
- Error handling and edge cases
- Cleanup and parallel execution stability

**Base URL:**  
https://reqres.in  

**Framework:**  
Playwright (APIRequestContext)

**Execution Mode:**  
Parallel execution (6 workers)

---

## Test Suite Structure

```

Pharma VoiceApiTest.spec.js
├── Utility - Cleanup Operations
├── Transcripts Endpoints
├── Transcribe Endpoint
├── Feedback & Delete Endpoints
└── Edge & Concurrency Scenarios

```

---

## Utility Tests

### UTIL_01 – Delete transcripts by MR name

**Purpose**
- Removes all transcripts uploaded by a given `mr_name`
- Prevents data leakage across tests
- Ensures test isolation under parallel execution

**Expected Result**
- All matching transcripts are soft deleted

---

## GET /transcripts/all

### TC_01 – Validate successful transcripts only

**Type:** Positive  
**Description:**  
Fetch all transcripts and validate only those with `status = Completed`.

**Assertions**
- HTTP 200
- Response is an array
- Only completed transcripts are considered
- `full_transcript` and `summary` are non-empty strings

**Notes**
- Uses extended timeout (2 minutes)
- Skipped if no completed transcript exists

---

### TC_02 – Validate failed transcripts only

**Type:** Positive  
**Description:**  
Validate transcripts whose status starts with `Failed`.

**Assertions**
- `error` field exists
- `error` is non-empty

---

## GET /transcript/{mongo_id}

### TC_03 – Get completed transcript by valid ID

**Type:** Positive  
**Assertions**
- HTTP 200
- `status = Completed`
- `full_transcript` and `summary` present

---

### TC_04 – Get failed transcript by ID

**Type:** Negative  
**Assertions**
- HTTP 200
- `status` starts with `Failed`
- `error` present

---

### TC_05 – Invalid ID format

**Type:** Negative  
**Expected Status**
- 400 / 404 / 422

---

### TC_06 – Empty ID

**Type:** Negative  
**Expected Status**
- 404 / 405

---

### TC_07 – Special characters in ID

**Type:** Negative  
**Expected Status**
- 400 / 404 / 422

---

## POST /transcribe – End to End

### TC_08 – E2E MP3 upload & transcription

**Type:** End-to-End  
**Description**
- Upload MP3 file
- Poll transcript status until `Completed`

**Assertions**
- Upload success (200 / 201)
- Final status is `Completed`
- `full_transcript` and `summary` exist

---

## POST /transcribe – Upload Scenarios

### TC_09 – Upload MP3 file

**Type:** Positive  
**Expected**
- 200 / 201

---

### TC_10 – Upload WAV file

**Type:** Positive  
**Expected**
- 200 / 201

**Notes**
- Uses unique filename to avoid duplicate conflicts under parallel execution

---

### TC_11 – Upload MP4 file

**Type:** Positive  
**Expected**
- 200 / 201

---

### TC_12 – Upload MP3 with no spoken words

**Type:** Positive (behavioral)  
**Expected**
- Upload succeeds
- Final transcript status is `Failed`

---

### TC_13 – Transcribe without audio file

**Type:** Negative  
**Expected Status**
- 400 / 409 / 422

---

### TC_14 – Invalid file type

**Type:** Negative  
**Expected Status**
- 400 / 409 / 422

---

### TC_15 – Empty request body

**Type:** Negative  
**Expected Status**
- 422

---

### TC_16 – Duplicate file upload

**Type:** Negative  
**Expected**
- First upload: 200 / 201
- Second upload: 400 / 409 / 422

---

### TC_17 – Upload file larger than 200MB

**Type:** Negative  
**Expected**
- 400 / 413 / 422 / 200 (backend-dependent)

---

## POST /transcript/{mongo_id}/feedback

### TC_18 – Regenerate summary with valid feedback (fresh transcript)

**Type:** Positive  
**Description**
- Uploads a fresh WAV file
- Waits for `Completed`
- Regenerates summary

**Assertions**
- HTTP 200
- `summary_field` is non-empty
- `status = success`

**Notes**
- Handles AI processing delay
- Parallel-safe
- Extended timeout used

---

### TC_19 – Regenerate summary without feedback

**Type:** Negative  
**Expected Status**
- 400 / 404 / 422

---

### TC_20 – Regenerate summary for non-existent transcript

**Type:** Negative  
**Expected Status**
- 400 / 404 / 422

---

## POST /transcript/{mongo_id}/delete

### TC_21 – Soft delete transcript by valid ID

**Type:** Positive  
**Expected**
- 200 or 404 (already deleted)

---

### TC_22 – Soft delete non-existent transcript

**Type:** Negative  
**Expected Status**
- 404 / 422

---

### TC_23 – Soft delete with invalid ID format

**Type:** Negative  
**Expected Status**
- 400 / 404 / 422

---

## Edge & Advanced Scenarios

### TC_24 – GET /transcripts/all returns empty array

**Type:** Edge  
**Expected**
- Empty array

---

### TC_25 – Validate transcript status values

**Allowed Status Values**
- Completed
- Processing
- Failed
- Failed - Upload Error

---

### TC_26 – Fetch transcript after soft delete

**Expected**
- 200 with `isDeleted = true`  
OR  
- 404

---

### TC_27 – Fetch transcript while processing

**Expected**
- HTTP 200
- `status = Processing`
- Empty `full_transcript`

---

### TC_28 – Upload with only mandatory field (audio_file)

**Type:** Positive  
**Expected**
- 200 / 201

---

### TC_29 – Empty audio buffer

**Type:** Negative (async failure)  
**Expected**
- Upload accepted
- Processing eventually fails

---

### TC_30 – Very long metadata values

**Type:** Edge  
**Expected Status**
- 200 / 201 / 400 / 422

---

### TC_33 – Parallel transcribe requests (multiple files)

**Type:** Concurrency  
**Expected**
- No 5xx errors
- Status ∈ {200, 201, 409, 422}

---

### TC_34 – Multiple feedback regenerations (till v4)

**Type:** Edge  
**Expected**
- Summary regenerates successfully until version v4
- Further regeneration fails

---

### TC_35 – Regenerate summary fails at v5

**Type:** Negative  
**Description**
- Detects current summary version
- Forces regeneration to v4 if needed
- Attempts v5

**Expected**
- 400 / 409 / 422
- Error mentions version limit

---

## Test Data

**Directory**
```

tests/api/test-data/audio/

````

**Files**
- test_audio.mp3
- test_audio_1.mp3
- test_wav_audio.wav
- test_mp4_audio.mp4
- test_audio_no_words.mp3
- test_audio_more200mb.mp4
- empty_audio.wav
- fresh_audio.wav
- parallel_audio_*.m4a

---

## Key Design Principles

- Parallel-safe test execution
- Unique filenames for uploads
- Cleanup utilities for DB hygiene
- Version-aware summary validation
- Flexible assertions for backend variability
- Explicit skips instead of false failures

---

## Execution

```bash
npx playwright test tests/api/Pharma VoiceApiTest.spec.js
npx playwright show-report
````

---

## Final Status

✔ Stable
✔ Parallel-safe
✔ CI-ready
✔ Business-rule aligned
✔ Enterprise-grade API automation

```