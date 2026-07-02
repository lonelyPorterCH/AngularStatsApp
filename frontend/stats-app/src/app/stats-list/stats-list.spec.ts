import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsList } from './stats-list';
import {provideRouter} from '@angular/router';

describe('StatsList', () => {
  let component: StatsList;
  let fixture: ComponentFixture<StatsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsList],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
