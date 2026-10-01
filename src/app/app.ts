import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCalendar, MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
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
  selector: 'app-calendar-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="mat-calendar-header">
      <div class="mat-calendar-controls">
        <button
          mat-button
          type="button"
          class="mat-calendar-period-button"
          (click)="currentPeriodClicked()"
          [attr.aria-label]="periodButtonLabel"
        >
          <span aria-hidden="true">{{ periodButtonText }}</span>
          <svg
            class="mat-calendar-arrow"
            [class.mat-calendar-invert]="calendar.currentView !== 'month'"
            viewBox="0 0 10 5"
            focusable="false"
            aria-hidden="true"
          >
            <polygon points="0,0 5,5 10,0" />
          </svg>
        </button>

        <div class="mat-calendar-actions">
          <button
            mat-icon-button
            type="button"
            class="mat-calendar-today-button"
            aria-label="Jump to today"
            (click)="goToToday()"
          >
            <mat-icon>today</mat-icon>
          </button>

          <button
            mat-icon-button
            type="button"
            class="mat-calendar-previous-button"
            [disabled]="!previousEnabled()"
            (click)="previousClicked()"
            [attr.aria-label]="previousButtonLabel"
          >
            <mat-icon>chevron_left</mat-icon>
          </button>

          <button
            mat-icon-button
            type="button"
            class="mat-calendar-next-button"
            [disabled]="!nextEnabled()"
            (click)="nextClicked()"
            [attr.aria-label]="nextButtonLabel"
          >
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .mat-calendar-header {
        display: block;
      }

      .mat-calendar-controls {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        width: 100%;
        margin: 0;
      }

      .mat-calendar-period-button {
        flex: 0 1 auto;
        min-width: 0;
        justify-content: center;
        margin-left: 0;
        margin-right: 0;
        padding-left: 8px;
        padding-right: 8px;
        white-space: nowrap;
      }

      .mat-calendar-period-button span {
        display: inline-block;
        white-space: nowrap;
      }

      .mat-calendar-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-left: auto;
        flex-shrink: 0;
      }

      .mat-calendar-today-button {
        flex-shrink: 0;
        margin-left: 0;
        margin-right: 0;
      }

      .mat-calendar-arrow {
        width: 0.625rem;
        height: 0.625rem;
        margin-left: 0.25rem;
        flex-shrink: 0;
        transition: transform 0.2s ease;
      }

      .mat-calendar-invert {
        transform: rotate(180deg);
      }
    `,
  ],
})
export class DatePickerHeaderComponent {
  protected readonly calendar = inject(MatCalendar<Date>);
  private readonly datepicker = inject(MatDatepicker<Date>);
  private readonly adapter = inject(DateAdapter<Date>);
  protected periodButtonText = '';
  protected periodButtonLabel = '';
  protected previousButtonLabel = '';
  protected nextButtonLabel = '';

  constructor() {
    this.updateLabels();
    this.calendar.stateChanges.subscribe(() => this.updateLabels());
  }

  protected goToToday(): void {
    const today = this.adapter.today();
    this.calendar.activeDate = today;
    this.calendar.currentView = 'month';
    this.datepicker.select(today);
    this.datepicker.close();
  }

  protected currentPeriodClicked(): void {
    this.calendar.currentView = this.calendar.currentView === 'month' ? 'multi-year' : 'month';
    this.updateLabels();
  }

  protected previousClicked(): void {
    if (!this.previousEnabled()) return;
    if (this.calendar.currentView === 'month') {
      this.calendar.activeDate = this.adapter.addCalendarMonths(this.calendar.activeDate, -1);
      return;
    }
    if (this.calendar.currentView === 'year') {
      this.calendar.activeDate = this.adapter.addCalendarYears(this.calendar.activeDate, -1);
      return;
    }
    this.calendar.activeDate = this.adapter.addCalendarYears(this.calendar.activeDate, -12);
  }

  protected nextClicked(): void {
    if (!this.nextEnabled()) return;
    if (this.calendar.currentView === 'month') {
      this.calendar.activeDate = this.adapter.addCalendarMonths(this.calendar.activeDate, 1);
      return;
    }
    if (this.calendar.currentView === 'year') {
      this.calendar.activeDate = this.adapter.addCalendarYears(this.calendar.activeDate, 1);
      return;
    }
    this.calendar.activeDate = this.adapter.addCalendarYears(this.calendar.activeDate, 12);
  }

  protected previousEnabled(): boolean {
    if (!this.calendar.minDate) return true;
    return !this.isSameView(this.calendar.activeDate, this.calendar.minDate);
  }

  protected nextEnabled(): boolean {
    return (
      !this.calendar.maxDate || !this.isSameView(this.calendar.activeDate, this.calendar.maxDate)
    );
  }

  private updateLabels(): void {
    const activeDate = this.calendar.activeDate;

    if (this.calendar.currentView === 'month') {
      this.periodButtonText = this.adapter
        .format(activeDate, { year: 'numeric', month: 'long' })
        .toUpperCase();
      this.periodButtonLabel = 'Switch to multi-year view';
      this.previousButtonLabel = 'Previous month';
      this.nextButtonLabel = 'Next month';
      return;
    }

    if (this.calendar.currentView === 'year') {
      this.periodButtonText = this.adapter.getYear(activeDate).toString();
      this.periodButtonLabel = 'Switch to month view';
      this.previousButtonLabel = 'Previous year';
      this.nextButtonLabel = 'Next year';
      return;
    }

    const activeYear = this.adapter.getYear(activeDate);
    const minYear = activeYear - (activeYear % 12);
    const maxYear = minYear + 11;
    this.periodButtonText = `${minYear}–${maxYear}`;
    this.periodButtonLabel = 'Switch to month view';
    this.previousButtonLabel = 'Previous 12 years';
    this.nextButtonLabel = 'Next 12 years';
  }

  private isSameView(date1: Date, date2: Date): boolean {
    if (this.calendar.currentView === 'month') {
      return (
        this.adapter.getYear(date1) === this.adapter.getYear(date2) &&
        this.adapter.getMonth(date1) === this.adapter.getMonth(date2)
      );
    }

    if (this.calendar.currentView === 'year') {
      return this.adapter.getYear(date1) === this.adapter.getYear(date2);
    }

    const year1 = this.adapter.getYear(date1);
    const year2 = this.adapter.getYear(date2);
    return Math.floor(year1 / 12) === Math.floor(year2 / 12);
  }
}

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
  protected readonly calendarHeaderComponent = DatePickerHeaderComponent;
  protected readonly selectedDate = signal(this.startOfDay(new Date()));
  protected readonly activeTab = signal<Tab>('feeding');
  protected readonly isFormOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingType = signal<EditingType>(null);
  protected readonly records = signal<Record[]>([]);
  protected draft: Draft = this.emptyDraft();
  protected weightDraft: WeightDraft = this.emptyWeightDraft();

  constructor(
    protected readonly auth: AuthService,
    private readonly logStorage: LogStorageService,
    private readonly snackBar: MatSnackBar,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      const selectedDate = this.selectedDate();
      if (!user) {
        this.records.set([]);
        return;
      }

      const previousDate = new Date(selectedDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const dates = [this.dateKey(selectedDate), this.dateKey(previousDate)];
      let rangeRecords: Record[] = [];
      let latestWeight: WeightRecord | undefined;
      const updateRecords = () => {
        const records = [...rangeRecords];
        const weight = latestWeight;
        if (weight && !records.some((record) => record.id === weight.id)) records.push(weight);
        this.records.set(records);
      };
      const showSyncError = () =>
        this.snackBar.open(
          'Unable to sync records. Check your connection and try again.',
          'Dismiss',
          {
            duration: 5000,
          },
        );
      const unsubscribeRange = this.logStorage.subscribeRecordsForDates(
        dates,
        (records) => {
          rangeRecords = records;
          updateRecords();
        },
        showSyncError,
      );
      const unsubscribeWeight = this.logStorage.subscribeLatestWeight(
        this.dateKey(selectedDate),
        (weight) => {
          latestWeight = weight;
          updateRecords();
        },
        showSyncError,
      );

      onCleanup(() => {
        unsubscribeRange();
        unsubscribeWeight();
      });
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
    return this.latestWeightOnOrBefore(this.selectedDateKey);
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
  protected get dailyFeedingRecords(): FeedingRecord[] {
    return this.visibleFeedingRecords.filter((record) => record.milk > 0 || record.supplement > 0);
  }
  protected get dailyFeedingCount(): number {
    return this.dailyFeedingRecords.length;
  }
  protected get dailyFeedingAverage(): number {
    return this.dailyFeedingCount === 0
      ? 0
      : Math.round(this.dailyVolumeTotal / this.dailyFeedingCount);
  }
  protected get dailyPeeCount(): number {
    return this.visibleFeedingRecords.filter((record) => record.pee).length;
  }
  protected get dailyPoopCount(): number {
    return this.visibleFeedingRecords.filter((record) => record.poop).length;
  }
  protected get feedingGoal(): number | undefined {
    const weight = this.selectedDayWeight;
    return weight ? Math.round((weight.weight / 1000) * 150) : undefined;
  }
  protected get isSelectedDateFuture(): boolean {
    return this.selectedDateKey > this.dateKey(new Date());
  }
  protected get remainingFeedingAmount(): number | undefined {
    return this.feedingGoal === undefined
      ? undefined
      : Math.max(this.feedingGoal - this.dailyVolumeTotal, 0);
  }
  protected get feedingGoalStatus(): 'today' | 'remaining' | 'reached' | 'exceeded' {
    const goal = this.feedingGoal;
    if (
      this.selectedDateKey === this.dateKey(new Date()) &&
      goal !== undefined &&
      this.dailyVolumeTotal < goal
    ) {
      return 'today';
    }
    if (goal === undefined || this.dailyVolumeTotal < goal) return 'remaining';
    return this.dailyVolumeTotal === goal ? 'reached' : 'exceeded';
  }
  protected get feedingGoalStatusLabel(): string {
    if (this.feedingGoalStatus === 'reached') return 'Goal reached';
    if (this.feedingGoalStatus === 'exceeded') {
      return `Over goal by ${this.dailyVolumeTotal - (this.feedingGoal ?? 0)} mL`;
    }
    return `${this.remainingFeedingAmount} mL remaining`;
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
      this.upsertRecord(record);
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
      this.upsertRecord(record);
    } else {
      const record = { id: currentId, ...this.weightRecord() };
      await this.logStorage.update(record);
      this.records.update((records) =>
        records.map((existing) => (existing.id === currentId ? record : existing)),
      );
    }
    this.cancelForm();
  }
  private upsertRecord(record: Record): void {
    this.records.update((records) => [
      ...records.filter((existing) => existing.id !== record.id),
      record,
    ]);
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
  private latestWeightOnOrBefore(date: string): WeightRecord | undefined {
    return this.records()
      .filter((record): record is WeightRecord => record.type === 'weight' && record.date <= date)
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];
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
