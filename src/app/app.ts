import { Component, effect, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeedingRecord, Record, WeightRecord } from './record.model';
import { AuthService } from './auth.service';
import { LogStorageService } from './log-storage.service';

interface Draft {
  time: string;
  milk: number | null;
  supplement: number | null;
  pee: boolean;
  poop: boolean;
}

interface WeightDraft {
  time: string;
  weight: number | null;
}

type Tab = 'feeding' | 'weight';
type EditingType = Tab | null;

@Component({
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly selectedDate = signal(this.startOfDay(new Date()));
  protected readonly activeTab = signal<Tab>('feeding');
  protected readonly isFormOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingType = signal<EditingType>(null);
  protected readonly records = signal<Record[]>([]);
  protected draft: Draft = this.emptyDraft();
  protected weightDraft: WeightDraft = this.emptyWeightDraft();
  private recordsLoadVersion = 0;

  constructor(
    protected readonly auth: AuthService,
    private readonly logStorage: LogStorageService,
    private readonly snackBar: MatSnackBar,
  ) {
    effect(() => {
      const user = this.auth.user();
      const selectedDate = this.selectedDate();
      const loadVersion = ++this.recordsLoadVersion;
      if (user) void this.loadRecords(selectedDate, loadVersion);
      else this.records.set([]);
    });
  }

  protected get selectedDateKey(): string {
    return this.dateKey(this.selectedDate());
  }
  protected get visibleFeedingRecords(): FeedingRecord[] {
    return this.records()
      .filter(
        (record): record is FeedingRecord =>
          record.type !== 'weight' && record.date === this.selectedDateKey,
      )
      .sort((a, b) => b.time.localeCompare(a.time));
  }
  protected get visibleWeightRecords(): WeightRecord[] {
    return this.records()
      .filter(
        (record): record is WeightRecord =>
          record.type === 'weight' && record.date === this.selectedDateKey,
      )
      .sort((a, b) => b.time.localeCompare(a.time));
  }
  protected get latestWeight(): WeightRecord | undefined {
    return this.records()
      .filter((record): record is WeightRecord => record.type === 'weight')
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];
  }
  protected get selectedDayWeight(): WeightRecord | undefined {
    return this.latestWeightForDate(this.selectedDateKey);
  }
  protected get previousDayWeight(): WeightRecord | undefined {
    const previousDay = new Date(this.selectedDate());
    previousDay.setDate(previousDay.getDate() - 1);
    return this.latestWeightForDate(this.dateKey(previousDay));
  }
  protected get weightChange(): number | undefined {
    const currentWeight = this.selectedDayWeight;
    const previousWeight = this.previousDayWeight;
    return currentWeight && previousWeight
      ? currentWeight.weight - previousWeight.weight
      : undefined;
  }
  protected get weightComparisonDateLabel(): string | undefined {
    const previousWeight = this.previousDayWeight;
    if (!previousWeight) return undefined;
    if (this.selectedDateKey === this.dateKey(new Date())) return 'yesterday';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
      new Date(`${previousWeight.date}T00:00:00`),
    );
  }
  protected get dailyMilkTotal(): number {
    return this.visibleFeedingRecords.reduce((total, record) => total + record.milk, 0);
  }
  protected get dailySupplementTotal(): number {
    return this.visibleFeedingRecords.reduce((total, record) => total + record.supplement, 0);
  }
  protected get dailyVolumeTotal(): number {
    return this.dailyMilkTotal + this.dailySupplementTotal;
  }
  protected get feedingGoal(): number | undefined {
    const weight = this.latestWeight;
    return weight ? Math.round((weight.weight / 1000) * 150) : undefined;
  }
  protected get suggestedFeedingSession(): number | undefined {
    return this.feedingGoal === undefined ? undefined : Math.round(this.feedingGoal / 8);
  }
  protected get selectedDateLabel(): string {
    if (this.selectedDateKey === this.dateKey(new Date())) return 'Today';
    return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(
      this.selectedDate(),
    );
  }

  protected selectTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.cancelForm();
  }
  protected openNewRecord(): void {
    this.editingId.set(null);
    this.editingType.set(null);
    this.draft = this.emptyDraft();
    this.weightDraft = this.emptyWeightDraft();
    this.isFormOpen.set(true);
    this.scrollToEntryForm();
  }
  protected editRecord(record: FeedingRecord): void {
    this.editingId.set(record.id);
    this.editingType.set('feeding');
    this.draft = {
      time: record.time,
      milk: record.milk || null,
      supplement: record.supplement || null,
      pee: record.pee,
      poop: record.poop,
    };
    this.isFormOpen.set(true);
    this.scrollToEntryForm();
  }
  protected editWeight(record: WeightRecord): void {
    this.editingId.set(record.id);
    this.editingType.set('weight');
    this.weightDraft = { time: record.time, weight: record.weight };
    this.isFormOpen.set(true);
    this.scrollToEntryForm();
  }
  protected async saveRecord(): Promise<void> {
    if (this.activeTab() === 'weight') {
      if (!this.weightDraft.weight || this.weightDraft.weight <= 0) return;
      await this.saveWeight();
      return;
    }
    if (!this.draft.milk && !this.draft.supplement && !this.draft.pee && !this.draft.poop) return;
    const currentId = this.editingId();
    if (currentId === null) {
      const record = await this.logStorage.add(this.draftRecord());
      this.records.update((records) => [...records, record]);
    } else {
      const record = { id: currentId, ...this.draftRecord() };
      await this.logStorage.update(record);
      this.records.update((records) =>
        records.map((existing) => (existing.id === currentId ? record : existing)),
      );
    }
    this.cancelForm();
  }
  protected async deleteRecord(id: string): Promise<void> {
    if (!this.auth.user()) return;
    const deletedRecord = this.records().find((record) => record.id === id);
    if (!deletedRecord) return;
    await this.logStorage.delete(id);
    this.records.update((records) => records.filter((record) => record.id !== id));
    this.snackBar
      .open('Record deleted', 'Undo', { duration: 30000 })
      .onAction()
      .subscribe(() => void this.restoreRecord(deletedRecord));
  }
  protected cancelForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.editingType.set(null);
  }
  protected selectDate(date: Date | null): void {
    if (date) this.selectedDate.set(this.startOfDay(date));
  }
  protected selectRelativeDate(days: number): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + days);
    this.selectedDate.set(this.startOfDay(date));
  }
  protected trackById(_: number, record: Record): string {
    return record.id;
  }

  private emptyDraft(): Draft {
    return {
      time: new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()),
      milk: null,
      supplement: null,
      pee: false,
      poop: false,
    };
  }
  private emptyWeightDraft(): WeightDraft {
    return { time: this.emptyDraft().time, weight: null };
  }
  private scrollToEntryForm(): void {
    setTimeout(() => {
      const entryPanel = document.getElementById('entry-panel');
      const entryHeading = document.getElementById('entry-heading');
      entryPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      entryHeading?.focus({ preventScroll: true });
    });
  }
  private async loadRecords(selectedDate: Date, loadVersion: number): Promise<void> {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const dates = [this.dateKey(selectedDate), this.dateKey(previousDate)];
    const [rangeRecords, latestWeight] = await Promise.all([
      this.logStorage.getRecordsForDates(dates),
      this.logStorage.getLatestWeight(),
    ]);
    if (loadVersion !== this.recordsLoadVersion) return;
    const records = [...rangeRecords];
    if (latestWeight && !records.some((record) => record.id === latestWeight.id)) {
      records.push(latestWeight);
    }
    this.records.set(records);
  }
  private async restoreRecord(record: Record): Promise<void> {
    await this.logStorage.update(record);
    this.records.update((records) =>
      records.some((existing) => existing.id === record.id) ? records : [...records, record],
    );
  }
  private async saveWeight(): Promise<void> {
    const currentId = this.editingId();
    if (currentId === null) {
      const record = await this.logStorage.add(this.weightRecord());
      this.records.update((records) => [...records, record]);
    } else {
      const record = { id: currentId, ...this.weightRecord() };
      await this.logStorage.update(record);
      this.records.update((records) =>
        records.map((existing) => (existing.id === currentId ? record : existing)),
      );
    }
    this.cancelForm();
  }
  private draftRecord(): Omit<FeedingRecord, 'id'> {
    return {
      type: 'feeding',
      date: this.selectedDateKey,
      time: this.draft.time,
      milk: this.draft.milk ?? 0,
      supplement: this.draft.supplement ?? 0,
      pee: this.draft.pee,
      poop: this.draft.poop,
    };
  }
  private weightRecord(): Omit<WeightRecord, 'id'> {
    return {
      type: 'weight',
      date: this.selectedDateKey,
      time: this.weightDraft.time,
      weight: this.weightDraft.weight ?? 0,
    };
  }
  private latestWeightForDate(date: string): WeightRecord | undefined {
    return this.records()
      .filter((record): record is WeightRecord => record.type === 'weight' && record.date === date)
      .sort((a, b) => b.time.localeCompare(a.time))[0];
  }
  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  private dateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }
}
