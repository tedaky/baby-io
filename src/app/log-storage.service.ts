import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { FeedingRecord, RatingRecord, Record, WeightRecord } from './record.model';

@Injectable({ providedIn: 'root' })
export class LogStorageService {
  private readonly logs = collection(firestore, 'logs');

  subscribeRecordsForDates(
    dates: string[],
    onChange: (records: Record[]) => void,
    onError: (error: Error) => void,
  ): () => void {
    return onSnapshot(
      query(this.logs, where('date', 'in', dates)),
      (snapshot) => {
        onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Record));
      },
      onError,
    );
  }

  subscribeLatestWeight(
    onOrBefore: string,
    onChange: (weight: WeightRecord | undefined) => void,
    onError: (error: Error) => void,
  ): () => void {
    return onSnapshot(
      query(
        this.logs,
        where('type', '==', 'weight'),
        where('date', '<=', onOrBefore),
        orderBy('date', 'desc'),
        orderBy('time', 'desc'),
        limit(1),
      ),
      (snapshot) => {
        const entry = snapshot.docs[0];
        onChange(entry ? ({ id: entry.id, ...entry.data() } as WeightRecord) : undefined);
      },
      onError,
    );
  }

  async add(record: Omit<FeedingRecord, 'id'>): Promise<FeedingRecord>;
  async add(record: Omit<WeightRecord, 'id'>): Promise<WeightRecord>;
  async add(record: Omit<RatingRecord, 'id'>): Promise<RatingRecord>;
  async add(
    record: Omit<FeedingRecord, 'id'> | Omit<WeightRecord, 'id'> | Omit<RatingRecord, 'id'>,
  ): Promise<Record> {
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
