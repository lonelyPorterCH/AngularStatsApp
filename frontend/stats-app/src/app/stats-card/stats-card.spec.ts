import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsCard } from './stats-card';
import {provideRouter} from '@angular/router';

describe('StatsCard', () => {
  let component: StatsCard;
  let fixture: ComponentFixture<StatsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsCard],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
