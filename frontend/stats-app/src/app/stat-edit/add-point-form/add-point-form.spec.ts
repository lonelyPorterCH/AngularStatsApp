import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPointForm } from './add-point-form';

describe('AddPointForm', () => {
  let component: AddPointForm;
  let fixture: ComponentFixture<AddPointForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPointForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPointForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
