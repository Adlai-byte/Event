// FormData Model - Represents form data and validation
export class LoginFormData {
  public email: string;
  public password: string;

  constructor(email: string = '', password: string = '') {
    this.email = email;
    this.password = password;
  }

  public isValid(): boolean {
    return this.email.trim() !== '' && this.password.trim() !== '';
  }

  public getEmailError(): string | null {
    if (!this.email.trim()) return 'Email is required';
    // Stricter email validation: requires proper domain and TLD (at least 2 characters)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email.trim())) return 'Please enter a valid email address';
    return null;
  }

  public getPasswordError(): string | null {
    if (!this.password.trim()) return 'Password is required';
    if (this.password.length < 6) return 'Password must be at least 6 characters long';
    return null;
  }

  public getErrors(): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    
    const emailError = this.getEmailError();
    if (emailError) errors.email = emailError;
    
    const passwordError = this.getPasswordError();
    if (passwordError) errors.password = passwordError;
    
    return errors;
  }

  public toJSON(): object {
    return {
      email: this.email,
      password: this.password
    };
  }
}

export class RegisterFormData {
  public firstName: string;
  public middleName: string; // optional
  public lastName: string;
  public suffix: string; // optional
  public email: string;
  public password: string;
  public confirmPassword: string;

  constructor(
    firstName: string = '',
    middleName: string = '',
    lastName: string = '',
    suffix: string = '',
    email: string = '',
    password: string = '',
    confirmPassword: string = ''
  ) {
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.suffix = suffix;
    this.email = email;
    this.password = password;
    this.confirmPassword = confirmPassword;
  }

  public getFullName(): string {
    const parts = [this.firstName, this.middleName, this.lastName, this.suffix]
      .map(p => (p || '').trim())
      .filter(p => p.length > 0);
    return parts.join(' ');
  }

  public isValid(): boolean {
    return this.firstName.trim() !== '' &&
           this.lastName.trim() !== '' &&
           this.email.trim() !== '' &&
           this.password.trim() !== '' &&
           this.confirmPassword.trim() !== '' &&
           this.password === this.confirmPassword;
  }

  public getFirstNameError(): string | null {
    if (!this.firstName.trim()) return 'First name is required';
    return null;
  }

  public getLastNameError(): string | null {
    if (!this.lastName.trim()) return 'Last name is required';
    return null;
  }

  public getEmailError(): string | null {
    if (!this.email.trim()) return 'Email is required';
    // Stricter email validation: requires proper domain and TLD (at least 2 characters)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email.trim())) return 'Please enter a valid email address';
    return null;
  }

  public getPasswordError(): string | null {
    if (!this.password.trim()) return 'Password is required';
    if (this.password.length < 6) return 'Password must be at least 6 characters long';
    return null;
  }

  public getConfirmPasswordError(): string | null {
    if (!this.confirmPassword.trim()) return 'Confirm password is required';
    if (this.password !== this.confirmPassword) return 'Passwords do not match';
    return null;
  }

  public getErrors(): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    
    const firstNameError = this.getFirstNameError();
    if (firstNameError) errors.firstName = firstNameError;
    const lastNameError = this.getLastNameError();
    if (lastNameError) errors.lastName = lastNameError;
    
    const emailError = this.getEmailError();
    if (emailError) errors.email = emailError;
    
    const passwordError = this.getPasswordError();
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = this.getConfirmPasswordError();
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    return errors;
  }

  public toJSON(): object {
    return {
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      suffix: this.suffix,
      fullName: this.getFullName(),
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword
    };
  }
}
















