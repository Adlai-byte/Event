// Centralized selectors for React Native Web components.
// RNW renders accessibilityLabel as aria-label.

export const LOGIN = {
  emailInput: '[aria-label="Email address"]',
  passwordInput: '[aria-label="Password"]',
  signInButton: '[aria-label="Sign in"]',
  signUpLink: '[aria-label="Go to sign up"]',
  forgotPassword: '[aria-label="Forgot password"]',
  showPassword: '[aria-label="Show password"]',
  hidePassword: '[aria-label="Hide password"]',
} as const;

export const FORGOT_PASSWORD = {
  emailInput: '[aria-label="Email address for password reset"]',
  sendResetLink: '[aria-label="Send password reset link"]',
  cancel: '[aria-label="Cancel password reset"]',
} as const;

export const REGISTER = {
  firstNameInput: '[aria-label="First name"]',
  lastNameInput: '[aria-label="Last name"]',
  middleNameInput: '[aria-label="Middle name"]',
  suffixInput: '[aria-label="Name suffix"]',
  emailInput: '[aria-label="Email address"]',
  passwordInput: '[aria-label="Password"]',
  confirmPasswordInput: '[aria-label="Confirm password"]',
  createAccountButton: '[aria-label="Create account"]',
  signInLink: '[aria-label="Go to sign in"]',
  showPassword: '[aria-label="Show password"]',
  hidePassword: '[aria-label="Hide password"]',
  showConfirmPassword: '[aria-label="Show confirm password"]',
  hideConfirmPassword: '[aria-label="Hide confirm password"]',
} as const;

export const LANDING = {
  accountLink: 'text=Account',
  logo: 'text=E-VENT',
  searchInput: 'input[placeholder="Search events, services..."]',
  hamburgerButton: '[class*="hamburger"]',
  getStartedCta: '[aria-label="Get started with registration"]',
  loginCta: '[aria-label="Login to your account"]',
} as const;
