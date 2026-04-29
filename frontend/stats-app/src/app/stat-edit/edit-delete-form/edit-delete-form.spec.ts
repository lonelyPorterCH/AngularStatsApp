import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeleteForm } from './edit-delete-form';

describe('EditDeleteForm', () => {
  let component: EditDeleteForm;
  let fixture: ComponentFixture<EditDeleteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeleteForm],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeleteForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
