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
import { Record } from './record.model';
import { AuthService } from './auth.service';
import { LogStorageService } from './log-storage.service';

interface Draft {
  time: string;
  milk: number | null;
  supplement: number | null;
  pee: boolean;
  poop: boolean;
}

@Component({
  imports: [DatePipe, FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly selectedDate = signal(this.startOfDay(new Date()));
  protected readonly isFormOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly records = signal<Record[]>([]);
  protected draft: Draft = this.emptyDraft();

  constructor(protected readonly auth: AuthService, private readonly logStorage: LogStorageService, private readonly snackBar: MatSnackBar) {
    effect(() => {
      const user = this.auth.user();
      if (user) void this.loadRecords();
      else this.records.set([]);
    });
  }

  protected get selectedDateKey(): string { return this.dateKey(this.selectedDate()); }
  protected get visibleRecords(): Record[] {
    return this.records().filter((record) => record.date === this.selectedDateKey).sort((a, b) => b.time.localeCompare(a.time));
  }
  protected get selectedDateLabel(): string {
    if (this.selectedDateKey === this.dateKey(new Date())) return 'Today';
    return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(this.selectedDate());
  }

  protected openNewRecord(): void { this.editingId.set(null); this.draft = this.emptyDraft(); this.isFormOpen.set(true); }
  protected editRecord(record: Record): void {
    this.editingId.set(record.id);
    this.draft = { time: record.time, milk: record.milk || null, supplement: record.supplement || null, pee: record.pee, poop: record.poop };
    this.isFormOpen.set(true);
  }
  protected async saveRecord(): Promise<void> {
    if (!this.draft.milk && !this.draft.supplement && !this.draft.pee && !this.draft.poop) return;
    const currentId = this.editingId();
    if (currentId === null) {
      const record = await this.logStorage.add(this.draftRecord());
      this.records.update((records) => [...records, record]);
    } else {
      const record = { id: currentId, ...this.draftRecord() };
      await this.logStorage.update(record);
      this.records.update((records) => records.map((existing) => existing.id === currentId ? record : existing));
    }
    this.cancelForm();
  }
  protected async deleteRecord(id: string): Promise<void> {
    if (!this.auth.user()) return;
    const deletedRecord = this.records().find((record) => record.id === id);
    if (!deletedRecord) return;
    await this.logStorage.delete(id);
    this.records.update((records) => records.filter((record) => record.id !== id));
    this.snackBar.open('Record deleted', 'Undo', { duration: 30000 })
      .onAction()
      .subscribe(() => void this.restoreRecord(deletedRecord));
  }
  protected cancelForm(): void { this.isFormOpen.set(false); this.editingId.set(null); }
  protected selectDate(date: Date | null): void { if (date) this.selectedDate.set(this.startOfDay(date)); }
  protected trackById(_: number, record: Record): string { return record.id; }

  private emptyDraft(): Draft {
    return { time: new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), milk: null, supplement: null, pee: false, poop: false };
  }
  private async loadRecords(): Promise<void> { this.records.set(await this.logStorage.getAll()); }
  private async restoreRecord(record: Record): Promise<void> {
    await this.logStorage.update(record);
    this.records.update((records) => records.some((existing) => existing.id === record.id) ? records : [...records, record]);
  }
  private draftRecord(): Omit<Record, 'id'> {
    return { date: this.selectedDateKey, time: this.draft.time, milk: this.draft.milk ?? 0, supplement: this.draft.supplement ?? 0, pee: this.draft.pee, poop: this.draft.poop };
  }
  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  private dateKey(date: Date): string { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
}
