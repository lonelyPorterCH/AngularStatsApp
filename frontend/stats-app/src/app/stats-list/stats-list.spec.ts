import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsList } from './stats-list';

describe('StatsList', () => {
  let component: StatsList;
  let fixture: ComponentFixture<StatsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsList],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
