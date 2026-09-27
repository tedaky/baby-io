import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { App } from './app';
import { AuthService } from './auth.service';
import { LogStorageService } from './log-storage.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideNativeDateAdapter(),
        {
          provide: AuthService,
          useValue: {
            user: () => ({ uid: 'test-user' }),
            isLoading: () => false,
            error: () => null,
          },
        },
        {
          provide: LogStorageService,
          useValue: {
            subscribeLatestWeight: (_date: string, onChange: (weight: any) => void) => {
              onChange(undefined);
              return () => undefined;
            },
            subscribeRecordsForDates: (_dates: string[], onChange: (records: any[]) => void) => {
              onChange([]);
              return () => undefined;
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Baby log');
  });

  it('should calculate the feeding goal from the selected day weight', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance as any;
    app.selectedDate.set(new Date(2025, 0, 2));
    fixture.detectChanges();
    app.records.set([
      { id: 'selected-day', type: 'weight', date: '2025-01-02', time: '08:00', weight: 2000 },
      {
        id: 'feeding',
        type: 'feeding',
        date: '2025-01-02',
        time: '12:00',
        milk: 100,
        supplement: 50,
        pee: false,
        poop: false,
      },
      { id: 'latest', type: 'weight', date: '2025-01-03', time: '08:00', weight: 3000 },
    ]);
    fixture.detectChanges();

    const summaryItems = fixture.nativeElement.querySelectorAll('.summary-item');
    expect(summaryItems[2].querySelector('strong')?.textContent).toContain('300 mL');
    expect(summaryItems[2].textContent).toContain('150 mL remaining');
    expect(
      summaryItems[2]
        .querySelector('.feeding-goal-status')
        ?.classList.contains('feeding-goal-not-reached'),
    ).toBe(true);

    app.records.update((records: any[]) =>
      records.map((record) =>
        record.id === 'feeding' ? { ...record, milk: 350, supplement: 0 } : record,
      ),
    );
    fixture.detectChanges();

    expect(summaryItems[2].textContent).toContain('Over goal by 50 mL');
    expect(
      summaryItems[2]
        .querySelector('.feeding-goal-status')
        ?.classList.contains('feeding-goal-reached'),
    ).toBe(true);
  });

  it('should use the latest weight on or before the selected day', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance as any;
    app.selectedDate.set(new Date(2025, 0, 2));
    fixture.detectChanges();
    app.records.set([
      { id: 'prior', type: 'weight', date: '2025-01-01', time: '08:00', weight: 2000 },
      { id: 'future', type: 'weight', date: '2025-01-03', time: '08:00', weight: 3000 },
    ]);
    fixture.detectChanges();

    const summaryItems = fixture.nativeElement.querySelectorAll('.summary-item');
    expect(summaryItems[0].textContent).toContain('2000 g');
    expect(summaryItems[0].textContent).toContain('Jan 1');
    expect(summaryItems[2].textContent).toContain('300 mL');
  });

  it('should show the feeding goal status in gray for a future date', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance as any;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    app.selectedDate.set(futureDate);
    fixture.detectChanges();
    app.records.set([
      {
        id: 'future-weight',
        type: 'weight',
        date: app.selectedDateKey,
        time: '08:00',
        weight: 2000,
      },
    ]);
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('.feeding-goal-status');
    expect(status?.classList.contains('feeding-goal-future')).toBe(true);
    expect(status?.classList.contains('feeding-goal-not-reached')).toBe(true);
  });

  it('should display records emitted by the live subscription', async () => {
    let emitRecords: (records: any[]) => void = () => undefined;
    TestBed.overrideProvider(LogStorageService, {
      useValue: {
        subscribeLatestWeight: (_date: string, onChange: (weight: any) => void) => {
          onChange(undefined);
          return () => undefined;
        },
        subscribeRecordsForDates: (_dates: string[], onChange: (records: any[]) => void) => {
          emitRecords = onChange;
          onChange([]);
          return () => undefined;
        },
      },
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance as any;
    app.selectedDate.set(new Date(2025, 0, 2));
    fixture.detectChanges();
    emitRecords([
      {
        id: 'remote-feeding',
        type: 'feeding',
        date: '2025-01-02',
        time: '12:00',
        milk: 120,
        supplement: 0,
        pee: false,
        poop: false,
      },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.summary-item:nth-child(2) strong')?.textContent,
    ).toContain('120 mL');
  });

  it('should not duplicate records when the live snapshot arrives before add resolves', async () => {
    let emitRecords: (records: any[]) => void = () => undefined;
    let liveRecords: any[] = [];
    TestBed.overrideProvider(LogStorageService, {
      useValue: {
        subscribeLatestWeight: (_date: string, onChange: (weight: any) => void) => {
          onChange(undefined);
          return () => undefined;
        },
        subscribeRecordsForDates: (_dates: string[], onChange: (records: any[]) => void) => {
          emitRecords = onChange;
          onChange([]);
          return () => undefined;
        },
        add: async (record: any) => {
          const created = { id: `new-${record.type}`, ...record };
          liveRecords = [...liveRecords, created];
          emitRecords(liveRecords);
          return created;
        },
      },
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance as any;
    app.draft = { time: '12:00', milk: 120, supplement: null, pee: false, poop: false };
    await app.saveRecord();

    app.activeTab.set('weight');
    app.weightDraft = { time: '12:30', weight: 3500 };
    await app.saveRecord();

    expect(app.records().filter((record: any) => record.id === 'new-feeding')).toHaveLength(1);
    expect(app.records().filter((record: any) => record.id === 'new-weight')).toHaveLength(1);
    expect(app.records()).toHaveLength(2);
    fixture.destroy();
  });
});
