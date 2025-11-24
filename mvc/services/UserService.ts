import { collection, getDocs, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminUserRow {
  name: string;
  email: string;
  role: string;
  status: string;
}

class UserService {
  private usersCollectionPath: string;

  constructor(collectionPath: string = 'users') {
    this.usersCollectionPath = collectionPath;
  }

  async listUsersOnce(): Promise<AdminUserRow[]> {
    const snapshot = await getDocs(collection(db, this.usersCollectionPath));
    return snapshot.docs.map(doc => this.mapToRow(doc.data()));
  }

  subscribeUsers(
    onChange: (rows: AdminUserRow[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      collection(db, this.usersCollectionPath),
      (snap: QuerySnapshot<DocumentData>) => {
        const rows = snap.docs.map(d => this.mapToRow(d.data()));
        onChange(rows);
      },
      (err) => {
        if (onError) onError(err as Error);
      }
    );
    return unsubscribe;
  }

  private mapToRow(data: any): AdminUserRow {
    const displayName: string = data.displayName || [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    return {
      name: displayName || 'Unknown User',
      email: data.email || '',
      role: data.role || 'User',
      status: data.status || (data.disabled ? 'Inactive' : 'Active')
    };
  }
}

export default new UserService();


