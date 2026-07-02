import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Archive } from './archive';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';

describe('Archive', () => {
  let component: Archive;
  let fixture: ComponentFixture<Archive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Archive],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Archive);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
