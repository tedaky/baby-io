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
            getAll: () => Promise.resolve([]),
            getLatestWeight: () => Promise.resolve(undefined),
            getRecordsForDates: () => Promise.resolve([]),
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
    app.records.set([
      { id: 'selected-day', type: 'weight', date: '2025-01-02', time: '08:00', weight: 2000 },
      { id: 'latest', type: 'weight', date: '2025-01-03', time: '08:00', weight: 3000 },
    ]);
    fixture.detectChanges();

    const summaryItems = fixture.nativeElement.querySelectorAll('.summary-item');
    expect(summaryItems[2].querySelector('strong')?.textContent).toContain('300 mL');
  });
});
