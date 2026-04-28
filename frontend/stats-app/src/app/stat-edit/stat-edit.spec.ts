import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatEdit } from './stat-edit';

describe('StatEdit', () => {
  let component: StatEdit;
  let fixture: ComponentFixture<StatEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(StatEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
