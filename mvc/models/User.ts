// User Model - Represents user data and business logic
export class User {
  public uid: string;
  public email: string | null;
  public displayName: string | null;
  public emailVerified: boolean;
  public createdAt?: Date;
  public lastLoginAt?: Date;
  
  // Additional profile information
  public firstName?: string;
  public middleName?: string;
  public lastName?: string;
  public suffix?: string;
  public phone?: string;
  public dateOfBirth?: string;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public role?: 'user' | 'admin' | 'provider';
  public profilePicture?: string;

  constructor(
    uid: string,
    email: string | null,
    displayName: string | null,
    emailVerified: boolean = false,
    createdAt?: Date,
    lastLoginAt?: Date,
    firstName?: string,
    middleName?: string,
    lastName?: string,
    suffix?: string,
    phone?: string,
    dateOfBirth?: string,
    address?: string,
    city?: string,
    state?: string,
    zipCode?: string,
    role?: 'user' | 'admin' | 'provider',
    profilePicture?: string
  ) {
    this.uid = uid;
    this.email = email;
    this.displayName = displayName;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt || new Date();
    this.lastLoginAt = lastLoginAt;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.suffix = suffix;
    this.phone = phone;
    this.dateOfBirth = dateOfBirth;
    this.address = address;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this.role = role || 'user';
    this.profilePicture = profilePicture;
  }

  // Business logic methods
  public getFullName(): string {
    // Use firstName and lastName from database if available
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`.trim();
    }
    // Fallback to displayName or email
    return this.displayName || this.email || 'Unknown User';
  }

  public isProfileComplete(): boolean {
    return !!(this.displayName && this.email);
  }

  public isPersonalInfoComplete(): boolean {
    // Check if required personal details are filled
    const hasPersonalDetails = !!(
      this.firstName && 
      this.firstName.trim() !== '' &&
      this.lastName && 
      this.lastName.trim() !== '' &&
      this.phone && 
      this.phone.trim() !== '' &&
      this.dateOfBirth && 
      this.dateOfBirth.trim() !== ''
    );
    return hasPersonalDetails;
  }

  public isAddressComplete(): boolean {
    // Check if required address information is filled
    const hasAddress = !!(
      this.address && 
      this.address.trim() !== '' &&
      this.city && 
      this.city.trim() !== '' &&
      this.state && 
      this.state.trim() !== '' &&
      this.zipCode && 
      this.zipCode.trim() !== ''
    );
    return hasAddress;
  }

  public isBookingInfoComplete(): boolean {
    // Check if both personal details and address are complete
    return this.isPersonalInfoComplete() && this.isAddressComplete();
  }

  public getInitials(): string {
    // Use firstName and lastName if available
    if (this.firstName && this.lastName) {
      return (this.firstName.charAt(0) + this.lastName.charAt(0)).toUpperCase();
    }
    // Fallback to displayName
    if (this.displayName) {
      return this.displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return this.email?.charAt(0).toUpperCase() || 'U';
  }

  public updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  public toJSON(): object {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      suffix: this.suffix,
      phone: this.phone,
      dateOfBirth: this.dateOfBirth,
      address: this.address,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      role: this.role,
      profilePicture: this.profilePicture
    };
  }

  public static fromFirebaseUser(firebaseUser: any): User {
    return new User(
      firebaseUser.uid,
      firebaseUser.email,
      firebaseUser.displayName,
      firebaseUser.emailVerified,
      firebaseUser.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime) : undefined,
      firebaseUser.metadata?.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined
    );
  }
}



