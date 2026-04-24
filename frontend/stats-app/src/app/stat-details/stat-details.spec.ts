import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatDetails } from './stat-details';

describe('StatDetails', () => {
  let component: StatDetails;
  let fixture: ComponentFixture<StatDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(StatDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
