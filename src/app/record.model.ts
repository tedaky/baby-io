interface RecordBase {
  id: string;
  date: string;
  time: string;
}

export interface FeedingRecord extends RecordBase {
  type?: 'feeding';
  milk: number;
  supplement: number;
  pee: boolean;
  poop: boolean;
}

export interface WeightRecord extends RecordBase {
  type: 'weight';
  weight: number;
}

export type Record = FeedingRecord | WeightRecord;
