import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateForm } from './create-form';

describe('CreateForm', () => {
  let component: CreateForm;
  let fixture: ComponentFixture<CreateForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
