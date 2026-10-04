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

export interface RatingRecord extends RecordBase {
  type: 'rating';
  period: 'night' | 'day';
  points: number;
}

export type Record = FeedingRecord | WeightRecord | RatingRecord;
