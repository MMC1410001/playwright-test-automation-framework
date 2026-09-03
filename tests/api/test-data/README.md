# Test Data Directory

This directory contains test files required for API test execution.

## Directory Structure

```
test-data/
├── audio/
│   ├── pharma_portal_audio.mp3
│   └── pharma_portal_audio.wav
└── images/
    ├── test_image.jpg
    └── test_image.png
```

## Required Files

### Audio Files

Place the following audio files in the `audio/` directory:

- **pharma_portal_audio.mp3** - Sample MP3 audio file for transcription testing
  - Format: MP3
  - Recommended duration: 30 seconds to 2 minutes
  - Used in: TC_02, TC_37, TC_38

- **pharma_portal_audio.wav** - Sample WAV audio file for E2E and stress testing
  - Format: WAV
  - Recommended duration: 30 seconds to 2 minutes
  - Used in: TC_05, TC_11, TC_12

### Image Files

Place the following image files in the `images/` directory:

- **test_image.jpg** - Sample JPEG image for upload testing
  - Format: JPEG/JPG
  - Recommended size: < 5MB
  - Used in: TC_25, TC_26, TC_28

- **test_image.png** - Sample PNG image for multiple upload testing
  - Format: PNG
  - Recommended size: < 5MB
  - Used in: TC_26

## How to Obtain Test Files

### Audio Files
You can create test audio files using:
1. Record a short audio clip using your device
2. Use online audio converters to convert between MP3 and WAV formats
3. Use sample audio files from free audio libraries

### Image Files
You can use any sample images:
1. Take screenshots or photos
2. Download sample images from free stock photo websites
3. Create simple test images using image editing tools

## Important Notes

- Ensure file names match exactly as specified above
- Keep file sizes reasonable to avoid long test execution times
- Audio files should contain clear speech for transcription testing
- Image files should be valid and not corrupted
- Do not commit sensitive or copyrighted content to version control

## Gitignore

The actual test files (audio and images) should be added to `.gitignore` to avoid committing large binary files to the repository. Only this README and directory structure should be committed.
