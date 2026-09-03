const { BasePage } = require('./base.page');
const { expect } = require('@playwright/test');

/**
 * Agent Configuration Page Object
 * Handles agent configuration form and voice recording functionality
 */
class AgentConfigPage extends BasePage {
  // @ts-ignore
  constructor(page) {
    super(page);

    // Form fields - use simple nth select approach since selects have no id/name
    // First select is language, second is voice
    this.languageSelector = page.locator('select').nth(0);
    this.voiceSelector = page.locator('select').nth(1);
    this.basePromptTextarea = page.getByPlaceholder('Enter the base prompt for your AI agent...').first();
    this.greetingMessageInput = page.getByPlaceholder('Enter the greeting message...').first();
    this.saveButton = page.getByRole('button', { name: /save|submit|update/i }).first();
    this.refreshButton = page.getByRole('button', { name: /refresh|reset|clear/i }).first();

    // Voice recording elements
    this.tapToSpeakButton = page.getByRole('button', { name: /tap to speak/i }).first();
    this.stopRecordingButton = page.getByRole('button', { name: /stop recording/i }).first();
    this.audioElement = page.locator('audio').first();
    this.playButton = page.locator('button[aria-label*="Play" i], button:has-text("Play")').first();
    this.pauseButton = page.locator('button[aria-label*="Pause" i], button:has-text("Pause")').first();

    // Blob animation (visual feedback during recording)
    this.blobAnimation = page.locator('[class*="blob"], [class*="animation"], svg[class*="animate"]').first();

    // Success/Error messages
    this.successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
    this.errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
  }

  /**
   * Navigate to Agent Config page
   * Note: Adjust the path based on actual URL structure
   */
  async navigateToAgentConfig() {
    // Try common paths for agent config
    try {
      await this.navigate('/agent-config');
    } catch (error) {
      // Try alternative paths
      try {
        await this.navigate('/config');
      } catch (err) {
        await this.navigate('/');
      }
    }
  }

  /**
   * Select a language from dropdown
   * @param {string} language - Language value (e.g., 'en-US', 'hi-IN', 'ar-SA')
   */
  async selectLanguage(language) {
    await this.languageSelector.selectOption(language);
    await this.page.waitForTimeout(300);
  }

  /**
   * Select a voice from dropdown
   * @param {string} voice - Voice value (e.g., 'en-US-female', 'en-IN-female')
   */
  async selectVoice(voice) {
    await this.voiceSelector.selectOption(voice);
    await this.page.waitForTimeout(300);
  }

  /**
   * Set base prompt text
   * @param {string} text - The base prompt text
   */
  async setBasePrompt(text) {
    await this.basePromptTextarea.click();
    // Use fill('') then fill(text) for better stability in some frameworks
    await this.basePromptTextarea.fill('');
    await this.basePromptTextarea.fill(text);
    // Trigger change event just in case
    await this.basePromptTextarea.blur();
  }

  /**
   * Set greeting message
   * @param {string} text - The greeting message
   */
  async setGreetingMessage(text) {
    await this.greetingMessageInput.click();
    await this.greetingMessageInput.fill('');
    await this.greetingMessageInput.fill(text);
    await this.greetingMessageInput.blur();
  }

  /**
   * Fill the entire configuration form
   * @param {Object} config - Configuration object
   * @param {string} config.language - Language selection
   * @param {string} config.voice - Voice selection
   * @param {string} config.basePrompt - Base prompt text
   * @param {string} config.greeting - Greeting message
   */
  async fillConfigForm(config) {
    if (config.language) await this.selectLanguage(config.language);
    if (config.voice) await this.selectVoice(config.voice);
    if (config.basePrompt) await this.setBasePrompt(config.basePrompt);
    if (config.greeting) await this.setGreetingMessage(config.greeting);
  }

  /**
   * Save the configuration
   */
  async saveConfiguration() {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000); // Wait for save to complete
  }

  /**
   * Get configuration from localStorage
   * @returns {Promise<Object>} Configuration object
   */
  async getConfigFromLocalStorage() {
    return await this.page.evaluate(() => {
      return {
        language: localStorage.getItem('agent_language') || localStorage.getItem('language'),
        voice: localStorage.getItem('agent_voice') || localStorage.getItem('voice'),
        basePrompt: localStorage.getItem('agent_basePrompt') || localStorage.getItem('basePrompt'),
        greeting: localStorage.getItem('agent_greeting') || localStorage.getItem('greeting'),
        theme: localStorage.getItem('theme')
      };
    });
  }

  /**
   * Get all available language options
   * @returns {Promise<string[]>} Array of language options
   */
  async getAvailableLanguages() {
    return await this.languageSelector.locator('option').allTextContents();
  }

  /**
   * Get all available voice options
   * @returns {Promise<string[]>} Array of voice options
   */
  async getAvailableVoices() {
    return await this.voiceSelector.locator('option').allTextContents();
  }

  /**
   * Get current form values
   * @returns {Promise<Object>} Current form values
   */
  async getCurrentFormValues() {
    return {
      language: await this.languageSelector.inputValue(),
      voice: await this.voiceSelector.inputValue(),
      basePrompt: await this.basePromptTextarea.inputValue(),
      greeting: await this.greetingMessageInput.inputValue()
    };
  }

  // ============ Voice Recording Methods ============

  /**
   * Starts voice recording by clicking the "Tap To Speak" button
   */
  async startVoiceRecording() {
    // Force click because the button has a continuous animation (animate-blob)
    // which makes it "unstable" and causes Playwright to wait indefinitely.
    await this.tapToSpeakButton.click({ force: true });
    await this.page.waitForTimeout(500);
  }

  /**
   * Stops voice recording by clicking the stop button
   */
  async stopVoiceRecording() {
    if (await this.stopRecordingButton.count() > 0) {
      await this.stopRecordingButton.click({ force: true });
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Checks if voice recording is currently active
   * @returns {Promise<boolean>}
   */
  async isRecordingActive() {
    try {
      // Use fast sequential checks to avoid hanging on animating elements

      // 1. Check for stop recording button visibility (most reliable)
      const stopButtonVisible = await this.stopRecordingButton.isVisible({ timeout: 800 }).catch(() => false);
      if (stopButtonVisible) return true;

      // 2. Check for text indicators (fast DOM count - no blocking)
      const textCount = await this.page.locator('text=/recording|stop recording/i').count();
      if (textCount > 0) return true;

      // 3. Check for blob/animation elements
      const blobCount = await this.page.locator('.animate-blob').count();
      if (blobCount > 0) return true;

      // 4. Check for stop/square SVG icons in buttons
      const iconCount = await this.page.locator('button svg.lucide-square, button svg.lucide-stop-circle').count();
      if (iconCount > 0) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if an audio element exists and is not empty
   * @returns {Promise<boolean>}
   */
  async hasAudioElement() {
    try {
      // Wait a bit for audio element to appear as it might be lazy-loaded/injected
      await this.audioElement.waitFor({ state: 'attached', timeout: 3000 });
      return await this.audioElement.count() > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Wait for a success message to appear after an action
   * @param {number} timeout - Timeout in ms
   */
  async waitForSuccess(timeout = 5000) {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if audio is currently playing
   * @returns {Promise<boolean>} True if audio is playing
   */
  async isAudioPlaying() {
    return await this.page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio && !audio.paused;
    });
  }

  /**
   * Check if audio is paused
   * @returns {Promise<boolean>} True if audio is paused
   */
  async isAudioPaused() {
    return await this.page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio && audio.paused;
    });
  }

  /**
   * Play recorded audio
   */
  async playRecordedAudio() {
    await this.playButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Pause recorded audio
   */
  async pauseRecordedAudio() {
    await this.pauseButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get audio duration
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration() {
    return await this.page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.duration : 0;
    });
  }

  /**
   * Check if blob animation is playing
   * @returns {Promise<boolean>} True if animation is visible
   */
  async isBlobAnimationPlaying() {
    try {
      return await this.blobAnimation.isVisible({ timeout: 2000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for error message
   * @returns {Promise<boolean>} True if error message is visible
   */
  async hasErrorMessage() {
    try {
      return await this.errorMessage.isVisible({ timeout: 3000 });
    } catch (error) {
      return false;
    }
  }

  /**
   * Get character count for base prompt
   * @returns {Promise<number>} Number of characters
   */
  async getBasePromptCharCount() {
    const text = await this.basePromptTextarea.inputValue();
    return text.length;
  }

  /**
   * Get character count for greeting message
   * @returns {Promise<number>} Number of characters
   */
  async getGreetingCharCount() {
    const text = await this.greetingMessageInput.inputValue();
    return text.length;
  }

  /**
   * Check if save button is enabled
   * @returns {Promise<boolean>} True if save button is enabled
   */
  async isSaveButtonEnabled() {
    return await this.saveButton.isEnabled();
  }

  /**
   * Check if save button is disabled
   * @returns {Promise<boolean>} True if save button is disabled
   */
  async isSaveButtonDisabled() {
    return await this.saveButton.isDisabled();
  }
}

module.exports = { AgentConfigPage };
