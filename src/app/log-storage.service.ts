import { Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { FeedingRecord, Record, WeightRecord } from './record.model';

@Injectable({ providedIn: 'root' })
export class LogStorageService {
  private readonly logs = collection(firestore, 'logs');

  async getAll(): Promise<Record[]> {
    const snapshot = await getDocs(query(this.logs, orderBy('date'), orderBy('time')));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Record);
  }

  async add(record: Omit<FeedingRecord, 'id'>): Promise<FeedingRecord>;
  async add(record: Omit<WeightRecord, 'id'>): Promise<WeightRecord>;
  async add(record: Omit<FeedingRecord, 'id'> | Omit<WeightRecord, 'id'>): Promise<Record> {
    const entry = await addDoc(this.logs, record);
    return { id: entry.id, ...record } as Record;
  }

  async update(record: Record): Promise<void> {
    const { id, ...data } = record;
    await setDoc(doc(this.logs, id), data);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.logs, id));
  }
}
