import {Component, inject, OnInit, signal} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {ChartComponent} from '../chart/chart';
import {MatIcon} from '@angular/material/icon';
import {Title} from '@angular/platform-browser';
import {forkJoin} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatError, MatFormField, MatLabel} from '@angular/material/form-field';
import {MatOption, MatSelect} from '@angular/material/select';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatInput} from '@angular/material/input';
import {yAxisBoundsValidator} from '../validators/y-axis-bounds.validator';

@Component({
  selector: 'app-stat-edit',
  imports: [
    MatButton,
    RouterLink,
    ChartComponent,
    MatIcon,
    MatSlideToggle,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    ReactiveFormsModule,
    MatInput,
    MatError
  ],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css',
})
export class StatEdit implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  readonly titleForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/)]]
  }, {updateOn: 'blur'});
  readonly renaming = signal(false);
  readonly renameError = signal('');
  readonly renameSaved = signal(false);
  stat = signal<Stat | undefined>(undefined);
  archived = signal<boolean>(false);
  smoothingSaving = signal(false);
  smoothingError = signal('');
  stackedSaving = signal(false);
  stackedError = signal('');
  yAxisBoundsSaving = signal(false);
  yAxisBoundsError = signal('');
  readonly yAxisBoundsForm = this.formBuilder.group({
    yAxisMin: this.formBuilder.control<number | null>(null),
    yAxisMax: this.formBuilder.control<number | null>(null)
  }, {updateOn: 'blur', validators: yAxisBoundsValidator});
  chartTypeSaving = signal(false);
  chartTypeError = signal('');
  effortComparisonSaving = signal(false);
  effortComparisonError = signal('');
  yAxisFormatSaving = signal(false);
  yAxisFormatError = signal('');

  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadStatById(id);
      }
    });
  }

  loadStatById(id: string) {
    this.smoothingError.set('');
    this.stackedError.set('');
    this.yAxisBoundsError.set('');
    this.chartTypeError.set('');
    this.effortComparisonError.set('');
    this.yAxisFormatError.set('');

    forkJoin({
      stat: this.statService.getStatById(id),
      archived: this.statService.isArchived(id)
    }).subscribe({
      next: result => {
        this.archived.set(result.archived);
        if (result.archived) {
          void this.router.navigate(['/stats', id]);
          return;
        }
        this.stat.set(result.stat);
        this.titleForm.reset({title: result.stat.title});
        this.renameError.set('');
        this.renameSaved.set(false);
        this.yAxisBoundsForm.reset({
          yAxisMin: result.stat.yAxisMin ?? null,
          yAxisMax: result.stat.yAxisMax ?? null
        });
        this.yAxisBoundsForm.enable();
        this.title.setTitle(`StatsApp - Edit ${result.stat.title}`);
      },
      error: err => {
        if (err.status === 404) {
          void this.router.navigate(['/stats', id]);
        } else {
          console.error(err);
        }
      }
    });
  }

  onChartTypeChange(chartType: 'line' | 'bar'): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.chartTypeSaving() || (stat.chartType ?? 'line') === chartType) return;
    this.chartTypeError.set('');
    this.chartTypeSaving.set(true);
    this.stat.set({...stat, chartType});
    this.statService.setChartType(stat.id, chartType).subscribe({
      next: () => this.chartTypeSaving.set(false),
      error: error => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, chartType: stat.chartType ?? 'line'} : current);
          const reason = error.status === 400 && typeof error.error === 'string'
            ? error.error : 'Could not save chart type.';
          this.chartTypeError.set(`${reason} The previous setting has been restored.`);
        }
        this.chartTypeSaving.set(false);
      }
    });
  }

  onSmoothingChange(smoothing: boolean): void {
    const stat = this.stat();
    if (!stat || stat.chartType === 'bar' || stat.effortComparison || this.archived() || this.smoothingSaving()) return;
    this.smoothingError.set('');
    this.smoothingSaving.set(true);
    this.stat.set({...stat, smoothing});
    this.statService.setSmoothing(stat.id, smoothing).subscribe({
      next: () => this.smoothingSaving.set(false),
      error: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, smoothing: stat.smoothing ?? false} : current);
          this.smoothingError.set('Could not save smoothing. The previous setting has been restored.');
        }
        this.smoothingSaving.set(false);
      }
    });
  }

  onEffortComparisonChange(effortComparison: boolean): void {
    const stat = this.stat();
    if (!stat || stat.chartType === 'bar' || this.archived() || this.effortComparisonSaving()) return;
    this.effortComparisonError.set('');
    this.effortComparisonSaving.set(true);
    this.stat.set({...stat, effortComparison});
    this.statService.setEffortComparison(stat.id, effortComparison).subscribe({
      next: () => this.effortComparisonSaving.set(false),
      error: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, effortComparison: stat.effortComparison ?? false} : current);
          this.effortComparisonError.set('Could not save Dots + trend. The previous setting has been restored.');
        }
        this.effortComparisonSaving.set(false);
      }
    });
  }

  onYAxisFormatChange(yAxisFormat: 'number' | 'pace'): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.yAxisFormatSaving() || (stat.yAxisFormat ?? 'number') === yAxisFormat) return;
    this.yAxisFormatError.set('');
    this.yAxisFormatSaving.set(true);
    this.stat.set({...stat, yAxisFormat});
    this.statService.setYAxisFormat(stat.id, yAxisFormat).subscribe({
      next: () => this.yAxisFormatSaving.set(false),
      error: error => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, yAxisFormat: stat.yAxisFormat ?? 'number'} : current);
          const reason = error.status === 400 && typeof error.error === 'string'
            ? error.error : 'Could not save value format.';
          this.yAxisFormatError.set(`${reason} The previous setting has been restored.`);
        }
        this.yAxisFormatSaving.set(false);
      }
    });
  }

  onStackedChange(stacked: boolean): void {
    const stat = this.stat();
    if (!stat || (stat.chartType !== 'bar' && stat.effortComparison) || this.archived()
      || this.stackedSaving() || (stacked && stat.datasets.length < 2)) return;
    this.stackedError.set('');
    this.stackedSaving.set(true);
    this.stat.set({...stat, stacked});
    this.statService.setStacked(stat.id, stacked).subscribe({
      next: () => this.stackedSaving.set(false),
      error: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, stacked: stat.stacked ?? false} : current);
          this.stackedError.set('Could not save stacking. The previous setting has been restored.');
        }
        this.stackedSaving.set(false);
      }
    });
  }

  onYAxisBoundsSave(): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.yAxisBoundsSaving() || this.yAxisBoundsForm.invalid) return;
    const {yAxisMin, yAxisMax} = this.yAxisBoundsForm.getRawValue();
    this.yAxisBoundsError.set('');
    this.yAxisBoundsSaving.set(true);
    this.yAxisBoundsForm.disable();
    this.stat.set({...stat, yAxisMin, yAxisMax});
    this.statService.setYAxisBounds(stat.id, yAxisMin, yAxisMax).subscribe({
      next: () => {
        this.yAxisBoundsSaving.set(false);
        if (!this.archived()) this.yAxisBoundsForm.enable();
      },
      error: error => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, yAxisMin: stat.yAxisMin,
            yAxisMax: stat.yAxisMax} : current);
          this.yAxisBoundsForm.reset({yAxisMin: stat.yAxisMin ?? null, yAxisMax: stat.yAxisMax ?? null});
          const reason = error.status === 400 && typeof error.error === 'string'
            ? error.error : 'Could not save Y-axis bounds.';
          this.yAxisBoundsError.set(`${reason} The previous setting has been restored.`);
        }
        this.yAxisBoundsSaving.set(false);
        if (!this.archived()) this.yAxisBoundsForm.enable();
      }
    });
  }

  renameGraph(): void {
    const stat = this.stat();
    if (!stat || this.renaming()) return;
    const activeElement = this.document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    this.titleForm.markAllAsTouched();
    if (this.titleForm.invalid) return;
    const title = this.titleForm.controls.title.value.trim();
    if (title === stat.title) return;
    this.renaming.set(true);
    this.renameError.set('');
    this.renameSaved.set(false);
    this.titleForm.disable();
    this.statService.renameStat(stat.id, title).subscribe({
      next: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, title} : current);
          this.titleForm.reset({title});
          this.title.setTitle(`StatsApp - Edit ${title}`);
          this.renameSaved.set(true);
        }
        this.titleForm.enable();
        this.renaming.set(false);
      },
      error: () => {
        this.titleForm.enable();
        this.renaming.set(false);
        this.renameError.set('Could not rename the graph. Please try again.');
      }
    });
  }

}
