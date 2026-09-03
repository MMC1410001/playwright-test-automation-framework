const { BasePage } = require('./base.page');
// @ts-ignore
const { expect } = require('@playwright/test');

/**
 * Admin Dashboard Page Object
 * Handles admin authentication, blog CRUD, categories, profile management
 */
class AdminDashboardPage extends BasePage {
  // @ts-ignore
  constructor(page) {
    super(page);

    // Login elements
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    this.googleLoginButton = page.getByRole('button', { name: /google|sign in with google/i }).first();
    this.microsoftLoginButton = page.getByRole('button', { name: /microsoft|sign in with microsoft/i }).first();

    // Sidebar navigation
    this.dashboardLink = page.locator('nav a:has-text("Dashboard"), [href*="/dashboard"]').first();
    this.blogsLink = page.locator('nav a:has-text("Blogs"), [href*="/blogs"]').first();
    this.categoriesLink = page.locator('nav a:has-text("Categories"), [href*="/categories"]').first();
    this.profileLink = page.locator('nav a:has-text("Profile"), [href*="/profile"]').first();
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first();

    // Welcome message
    this.welcomeMessage = page.locator('[class*="welcome"], h1, h2').first();

    // Blogs section
    this.addBlogButton = page.getByRole('button', { name: /add blog|new blog|create blog|\\+/i }).first();
    this.blogCards = page.locator('[class*="blog-card"], .blog-item, article');
    this.blogTable = page.locator('table').first();
    this.blogRows = page.locator('table tbody tr');
    this.editBlogButtons = page.locator('button[aria-label*="Edit" i], [data-action="edit"], button:has-text("Edit")');
    this.deleteBlogButtons = page.locator('button[aria-label*="Delete" i], [data-action="delete"], button:has-text("Delete")');
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|yes|delete/i }).first();
    this.cancelDeleteButton = page.getByRole('button', { name: /cancel|no/i }).first();

    // Blog form fields
    this.titleInput = page.locator('input[name="title"], input[id="title"]').first();
    this.slugInput = page.locator('input[name="slug"], input[id="slug"]').first();
    this.metaDescriptionInput = page.locator('textarea[name="metaDescription"], textarea[name="meta_description"]').first();
    this.excerptInput = page.locator('textarea[name="excerpt"]').first();
    this.categorySelect = page.locator('select[name="category"]').first();
    this.authorInput = page.locator('input[name="author"]').first();
    this.readTimeInput = page.locator('input[name="readTime"], input[name="read_time"]').first();
    this.postedDateInput = page.locator('input[name="postedDate"], input[type="date"]').first();
    this.posterImageInput = page.locator('input[name="posterImage"], input[type="file"]').first();
    this.keywordsInput = page.locator('input[name="keywords"]').first();

    // Rich text editor
    this.richTextEditor = page.locator('[contenteditable="true"], .ql-editor, textarea[name="content"]').first();
    this.boldButton = page.locator('button[class*="bold"], button[title="Bold"]').first();
    this.italicButton = page.locator('button[class*="italic"], button[title="Italic"]').first();
    this.underlineButton = page.locator('button[class*="underline"], button[title="Underline"]').first();
    this.undoButton = page.locator('button[class*="undo"], button[title="Undo"]').first();

    // Form action buttons
    this.saveButton = page.getByRole('button', { name: /save|submit/i }).first();
    this.publishButton = page.getByRole('button', { name: /publish/i }).first();
    this.draftButton = page.getByRole('button', { name: /draft|save as draft/i }).first();

    // Categories section
    this.addCategoryButton = page.getByRole('button', { name: /add category|new category|create category/i }).first();
    this.categoryRows = page.locator('table tbody tr, [class*="category-item"]');
    this.categoryNameInput = page.locator('input[name="categoryName"], input[name="name"]').first();
    this.categorySlugInput = page.locator('input[name="categorySlug"], input[name="slug"]').first();
    this.categoryDescInput = page.locator('textarea[name="categoryDescription"], textarea[name="description"]').first();
    this.editCategoryButtons = page.locator('button[aria-label*="Edit" i]:visible, button:has-text("Edit"):visible');
    this.deleteCategoryButtons = page.locator('button[aria-label*="Delete" i]:visible, button:has-text("Delete"):visible');

    // Profile section
    this.profileNameInput = page.locator('input[name="name"], input[id="name"]').first();
    this.profileEmailInput = page.locator('input[name="email"], input[type="email"]').first();
    this.designationInput = page.locator('input[name="designation"]').first();
    this.companyInput = page.locator('input[name="company"]').first();
    this.bioTextarea = page.locator('textarea[name="bio"]').first();
    this.updateProfileButton = page.getByRole('button', { name: /update|save/i }).first();

    // Status indicators
    this.draftStatus = page.locator('text=/draft/i').first();
    this.publishedStatus = page.locator('text=/published/i').first();

    // Headers
    this.pageTitle = page.locator('h1, [class*="page-title"]').first();
    this.blogsHeader = page.locator('text="Blogs"').first();
    this.categoriesHeader = page.locator('text="Categories"').first();

    // Success/Error messages
    this.successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
    this.errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
  }

  // ============ Authentication Methods ============

  /**
   * Login with email and password
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async login(email, password) {
    await this.navigate('/admin/login');
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with Google account
   */
  async loginWithGoogle() {
    await this.navigate('/admin/login');
    const [googlePage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.googleLoginButton.click()
    ]);
    return googlePage;
  }

  /**
   * Login with Microsoft account
   */
  async loginWithMicrosoft() {
    await this.navigate('/admin/login');
    const [microsoftPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.microsoftLoginButton.click()
    ]);
    return microsoftPage;
  }

  /**
   * Logout from admin dashboard
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>} True if logged in
   */
  async isLoggedIn() {
    try {
      return await this.dashboardLink.isVisible({ timeout: 3000 });
    } catch (error) {
      return false;
    }
  }

  // ============ Navigation Methods ============

  /**
   * Navigate to Dashboard
   */
  async navigateToDashboard() {
    await this.dashboardLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Blogs section
   */
  async navigateToBlogs() {
    await this.blogsLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Categories section
   */
  async navigateToCategories() {
    await this.categoriesLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Profile section
   */
  async navigateToProfile() {
    await this.profileLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if welcome message is displayed
   * @returns {Promise<boolean>} True if welcome message is visible
   */
  async hasWelcomeMessage() {
    try {
      return await this.welcomeMessage.isVisible({ timeout: 3000 });
    } catch (error) {
      return false;
    }
  }

  // ============ Blog CRUD Methods ============

  /**
   * Create a new blog
   * @param {Object} blogData - Blog data object
   * @param {string} blogData.title - Blog title
   * @param {string} blogData.slug - URL slug
   * @param {string} blogData.metaDescription - Meta description
   * @param {string} blogData.excerpt - Excerpt
   * @param {string} blogData.category - Category name
   * @param {string} blogData.author - Author name
   * @param {string} blogData.readTime - Read time
   * @param {string} blogData.content - Blog content
   * @param {boolean} blogData.publish - Whether to publish (true) or save as draft (false)
   */
  async createBlog(blogData) {
    await this.addBlogButton.click();
    await this.page.waitForTimeout(500);

    await this.titleInput.fill(blogData.title);
    await this.slugInput.fill(blogData.slug);

    if (await this.metaDescriptionInput.count() > 0) {
      await this.metaDescriptionInput.fill(blogData.metaDescription);
    }

    if (await this.excerptInput.count() > 0) {
      await this.excerptInput.fill(blogData.excerpt);
    }

    if (await this.categorySelect.count() > 0) {
      await this.categorySelect.selectOption(blogData.category);
    }

    if (await this.authorInput.count() > 0) {
      await this.authorInput.fill(blogData.author);
    }

    await this.richTextEditor.fill(blogData.content);

    if (blogData.publish) {
      await this.publishButton.click();
    } else {
      await this.saveButton.click();
    }

    await this.page.waitForTimeout(1000); // Wait for save
  }

  /**
   * Edit a blog by index
   * @param {number} index - Blog index (0-based)
   * @param {Object} updates - Fields to update
   */
  async editBlog(index, updates) {
    await this.editBlogButtons.nth(index).click();
    await this.page.waitForTimeout(500);

    // @ts-ignore
    if (updates.title) await this.titleInput.fill(updates.title);
    // @ts-ignore
    if (updates.content) await this.richTextEditor.fill(updates.content);
    // @ts-ignore
    if (updates.category) await this.categorySelect.selectOption(updates.category);

    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Delete a blog by index
   * @param {number} index - Blog index (0-based)
   */
  async deleteBlog(index) {
    await this.deleteBlogButtons.nth(index).click();
    await this.page.waitForTimeout(300);

    await this.confirmDeleteButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel blog deletion
   * @param {number} index - Blog index (0-based)
   */
  async cancelDeleteBlog(index) {
    await this.deleteBlogButtons.nth(index).click();
    await this.page.waitForTimeout(300);

    await this.cancelDeleteButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get blog count
   * @returns {Promise<number>} Number of blogs
   */
  async getBlogCount() {
    // Try table rows first, then cards
    const rowCount = await this.blogRows.count();
    if (rowCount > 0) return rowCount;

    return await this.blogCards.count();
  }

  /**
   * Get blog status (Draft/Published)
   * @param {number} index - Blog index (0-based)
   * @returns {Promise<string>} Status text
   */
  async getBlogStatus(index) {
    const row = this.blogRows.nth(index);
    const statusCell = row.locator('td').last(); // Assuming status is in last column
    return await statusCell.textContent();
  }

  /**
   * Check if blog table has headers
   * @returns {Promise<boolean>} True if headers exist
   */
  async hasBlogTableHeaders() {
    try {
      const headers = await this.blogTable.locator('thead th').allTextContents();
      return headers.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all blog table headers
   * @returns {Promise<string[]>} Array of header texts
   */
  async getBlogTableHeaders() {
    return await this.blogTable.locator('thead th').allTextContents();
  }

  // ============ Category CRUD Methods ============

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @param {string} categoryData.name - Category name
   * @param {string} categoryData.slug - URL slug
   * @param {string} categoryData.description - Description
   */
  async createCategory(categoryData) {
    await this.addCategoryButton.click();
    await this.page.waitForTimeout(500);

    await this.categoryNameInput.fill(categoryData.name);
    await this.categorySlugInput.fill(categoryData.slug);

    if (await this.categoryDescInput.count() > 0) {
      await this.categoryDescInput.fill(categoryData.description);
    }

    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Edit a category by index
   * @param {number} index - Category index (0-based)
   * @param {Object} updates - Fields to update
   */
  async editCategory(index, updates) {
    await this.editCategoryButtons.nth(index).click();
    await this.page.waitForTimeout(500);

    // @ts-ignore
    if (updates.name) await this.categoryNameInput.fill(updates.name);
    // @ts-ignore
    if (updates.slug) await this.categorySlugInput.fill(updates.slug);
    // @ts-ignore
    if (updates.description) await this.categoryDescInput.fill(updates.description);

    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Delete a category by index
   * @param {number} index - Category index (0-based)
   */
  async deleteCategory(index) {
    await this.deleteCategoryButtons.nth(index).click();
    await this.page.waitForTimeout(300);

    await this.confirmDeleteButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get category count
   * @returns {Promise<number>} Number of categories
   */
  async getCategoryCount() {
    return await this.categoryRows.count();
  }

  // ============ Profile Methods ============

  /**
   * Update profile information
   * @param {Object} profileData - Profile data
   */
  async updateProfile(profileData) {
    // @ts-ignore
    if (profileData.name) await this.profileNameInput.fill(profileData.name);
    // @ts-ignore
    if (profileData.email) await this.profileEmailInput.fill(profileData.email);
    // @ts-ignore
    if (profileData.designation) await this.designationInput.fill(profileData.designation);
    // @ts-ignore
    if (profileData.company) await this.companyInput.fill(profileData.company);
    // @ts-ignore
    if (profileData.bio) await this.bioTextarea.fill(profileData.bio);

    await this.updateProfileButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get current profile data
   * @returns {Promise<Object>} Profile data
   */
  async getProfileData() {
    return {
      name: await this.profileNameInput.inputValue(),
      email: await this.profileEmailInput.inputValue(),
      designation: await this.designationInput.inputValue(),
      company: await this.companyInput.inputValue(),
      bio: await this.bioTextarea.inputValue()
    };
  }

  // ============ Rich Text Editor Methods ============

  /**
   * Apply bold formatting
   */
  async applyBold() {
    await this.boldButton.click();
  }

  /**
   * Apply italic formatting
   */
  async applyItalic() {
    await this.italicButton.click();
  }

  /**
   * Apply underline formatting
   */
  async applyUnderline() {
    await this.underlineButton.click();
  }

  /**
   * Undo last action
   */
  async undoAction() {
    await this.undoButton.click();
  }

  // ============ Utility Methods ============

  /**
   * Check for success message
   * @returns {Promise<boolean>} True if success message is visible
   */
  async hasSuccessMessage() {
    try {
      return await this.successMessage.isVisible({ timeout: 3000 });
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
   * Get page title
   * @returns {Promise<string>} Page title text
   */
  async getPageTitle() {
    return await this.pageTitle.textContent();
  }
}

module.exports = { AdminDashboardPage };
