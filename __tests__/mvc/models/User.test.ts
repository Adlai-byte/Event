import { User } from '../../../mvc/models/User';

describe('User Model', () => {
  const createUser = (overrides = {}) =>
    new User(
      'uid-123',
      'test@example.com',
      'John Doe',
      true,
      new Date('2024-01-01'),
      new Date('2024-06-01'),
      'John',
      undefined,
      'Doe',
      undefined,
      '09171234567',
      '1990-01-15',
      '123 Main St',
      'Manila',
      'NCR',
      '1000',
      'user',
      undefined,
      ...Object.values(overrides),
    );

  describe('constructor', () => {
    it('should create a user with all fields', () => {
      const user = createUser();
      expect(user.uid).toBe('uid-123');
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('John Doe');
      expect(user.emailVerified).toBe(true);
      expect(user.role).toBe('user');
    });

    it('should default role to "user" when not provided', () => {
      const user = new User('uid-1', 'a@b.com', 'Test', false);
      expect(user.role).toBe('user');
    });

    it('should default createdAt to now when not provided', () => {
      const before = new Date();
      const user = new User('uid-1', 'a@b.com', 'Test', false);
      const after = new Date();
      expect(user.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getFullName', () => {
    it('should return firstName + lastName when available', () => {
      const user = createUser();
      expect(user.getFullName()).toBe('John Doe');
    });

    it('should fall back to displayName when names are missing', () => {
      const user = new User('uid-1', 'a@b.com', 'Display Name', false);
      expect(user.getFullName()).toBe('Display Name');
    });

    it('should fall back to email when displayName is null', () => {
      const user = new User('uid-1', 'a@b.com', null, false);
      expect(user.getFullName()).toBe('a@b.com');
    });

    it('should return "Unknown User" when nothing is available', () => {
      const user = new User('uid-1', null, null, false);
      expect(user.getFullName()).toBe('Unknown User');
    });
  });

  describe('isProfileComplete', () => {
    it('should return true when displayName and email are set', () => {
      const user = new User('uid-1', 'a@b.com', 'Test User', false);
      expect(user.isProfileComplete()).toBe(true);
    });

    it('should return false when displayName is missing', () => {
      const user = new User('uid-1', 'a@b.com', null, false);
      expect(user.isProfileComplete()).toBe(false);
    });
  });

  describe('isPersonalInfoComplete', () => {
    it('should return true when all required personal fields are filled', () => {
      const user = createUser();
      expect(user.isPersonalInfoComplete()).toBe(true);
    });

    it('should return false when firstName is empty', () => {
      const user = createUser();
      user.firstName = '';
      expect(user.isPersonalInfoComplete()).toBe(false);
    });

    it('should return false when phone is missing', () => {
      const user = createUser();
      user.phone = undefined;
      expect(user.isPersonalInfoComplete()).toBe(false);
    });
  });

  describe('isAddressComplete', () => {
    it('should return true when all address fields are filled', () => {
      const user = createUser();
      expect(user.isAddressComplete()).toBe(true);
    });

    it('should return false when city is empty', () => {
      const user = createUser();
      user.city = '';
      expect(user.isAddressComplete()).toBe(false);
    });
  });

  describe('isBookingInfoComplete', () => {
    it('should return true when personal + address are complete', () => {
      const user = createUser();
      expect(user.isBookingInfoComplete()).toBe(true);
    });

    it('should return false when address is incomplete', () => {
      const user = createUser();
      user.zipCode = undefined;
      expect(user.isBookingInfoComplete()).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('should return initials from firstName/lastName', () => {
      const user = createUser();
      expect(user.getInitials()).toBe('JD');
    });

    it('should return initials from displayName as fallback', () => {
      const user = new User('uid-1', 'a@b.com', 'Jane Smith', false);
      expect(user.getInitials()).toBe('JS');
    });

    it('should return first char of email as last fallback', () => {
      const user = new User('uid-1', 'a@b.com', null, false);
      expect(user.getInitials()).toBe('A');
    });

    it('should return "U" when nothing is available', () => {
      const user = new User('uid-1', null, null, false);
      expect(user.getInitials()).toBe('U');
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt to current time', () => {
      const user = createUser();
      const before = new Date();
      user.updateLastLogin();
      const after = new Date();
      expect(user.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('toJSON', () => {
    it('should return all fields as a plain object', () => {
      const user = createUser();
      const json = user.toJSON();
      expect(json).toHaveProperty('uid', 'uid-123');
      expect(json).toHaveProperty('email', 'test@example.com');
      expect(json).toHaveProperty('role', 'user');
      expect(json).toHaveProperty('firstName', 'John');
      expect(json).toHaveProperty('lastName', 'Doe');
    });
  });

  describe('fromFirebaseUser', () => {
    it('should create User from Firebase user object', () => {
      const firebaseUser = {
        uid: 'firebase-uid',
        email: 'fb@test.com',
        displayName: 'FB User',
        emailVerified: true,
        metadata: {
          creationTime: '2024-01-01T00:00:00Z',
          lastSignInTime: '2024-06-01T00:00:00Z',
        },
      };
      const user = User.fromFirebaseUser(firebaseUser);
      expect(user.uid).toBe('firebase-uid');
      expect(user.email).toBe('fb@test.com');
      expect(user.displayName).toBe('FB User');
      expect(user.emailVerified).toBe(true);
      expect(user.role).toBe('user');
    });
  });
});
