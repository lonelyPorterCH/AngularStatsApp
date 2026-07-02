import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatDetails } from './stat-details';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter, ActivatedRoute, convertToParamMap} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';

describe('StatDetails', () => {
  let component: StatDetails;
  let fixture: ComponentFixture<StatDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetails],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({afterClosed: () => of(false)})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
