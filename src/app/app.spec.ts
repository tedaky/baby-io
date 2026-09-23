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
          useValue: { user: () => null, isLoading: () => false, error: () => null },
        },
        {
          provide: LogStorageService,
          useValue: { getAll: () => Promise.resolve([]) },
        },
      ],
    })
      .compileComponents();
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
});
