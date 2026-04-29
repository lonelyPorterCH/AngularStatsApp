import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncreaseForm } from './increase-form';

describe('IncreaseForm', () => {
  let component: IncreaseForm;
  let fixture: ComponentFixture<IncreaseForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncreaseForm],
    }).compileComponents();

    fixture = TestBed.createComponent(IncreaseForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
