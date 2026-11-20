import {Component, inject, OnInit, signal, WritableSignal} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {ChartComponent} from '../chart/chart';
import {MatIcon} from '@angular/material/icon';
import {Title} from '@angular/platform-browser';
import {concatMap, forkJoin, from, Observable, tap} from 'rxjs';
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
  readonly chartDisplayForm = this.formBuilder.nonNullable.group({
    chartType: ['line' as 'line' | 'bar', Validators.required],
    effortComparison: [false],
    stacked: [false]
  }, {updateOn: 'blur'});
  chartDisplaySaving = signal(false);
  chartDisplayError = signal('');
  yAxisSaving = signal(false);
  yAxisError = signal('');
  readonly yAxisForm = this.formBuilder.group({
    yAxisFormat: this.formBuilder.nonNullable.control<'number' | 'pace' | 'percentage'>('number', Validators.required),
    yAxisMin: this.formBuilder.control<number | null>(null),
    yAxisMax: this.formBuilder.control<number | null>(null)
  }, {updateOn: 'blur', validators: yAxisBoundsValidator});
  readonly xAxisForm = this.formBuilder.nonNullable.group({
    xAxisScaleType: ['time' as 'time' | 'linear', Validators.required],
    xAxisUnit: ['']
  }, {updateOn: 'blur'});
  xAxisSaving = signal(false);
  xAxisError = signal('');
  readonly axisLabelsForm = this.formBuilder.nonNullable.group({
    xAxisName: ['', Validators.required],
    yAxisName: ['', Validators.required]
  }, {updateOn: 'blur'});
  axisLabelsSaving = signal(false);
  axisLabelsError = signal('');

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
    this.chartDisplayError.set('');
    this.yAxisError.set('');
    this.axisLabelsError.set('');

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
        this.chartDisplayForm.reset({
          chartType: result.stat.chartType ?? 'line',
          effortComparison: result.stat.effortComparison ?? false,
          stacked: result.stat.stacked ?? false
        });
        this.chartDisplayForm.enable();
        this.chartDisplayError.set('');
        this.titleForm.reset({title: result.stat.title});
        this.axisLabelsForm.reset({xAxisName: result.stat.xAxisName, yAxisName: result.stat.yAxisName});
        this.axisLabelsForm.enable();
        this.renameError.set('');
        this.renameSaved.set(false);
        this.yAxisForm.reset({
          yAxisFormat: result.stat.yAxisFormat ?? 'number',
          yAxisMin: result.stat.yAxisMin ?? null,
          yAxisMax: result.stat.yAxisMax ?? null
        });
        this.yAxisForm.enable();
        this.yAxisError.set('');
        this.xAxisForm.reset({
          xAxisScaleType: result.stat.xAxisScaleType ?? 'time',
          xAxisUnit: result.stat.xAxisUnit ?? ''
        });
        this.xAxisForm.enable();
        this.xAxisError.set('');
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

  onSmoothingChange(smoothing: boolean): void {
    // Deprecated: smoothing is now controlled at the dataset level.
  }

  onChartDisplaySave(): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.chartDisplaySaving() || this.chartDisplayForm.invalid
      || this.chartDisplayForm.pristine) return;
    const values = this.chartDisplayForm.getRawValue();
    const changes: {request: () => Observable<void>; update: Partial<Stat>}[] = [];
    if (values.chartType !== (stat.chartType ?? 'line')) {
      changes.push({request: () => this.statService.setChartType(stat.id, values.chartType),
        update: {chartType: values.chartType}});
    }
    if (values.chartType !== 'bar' && values.effortComparison !== (stat.effortComparison ?? false)) {
      changes.push({request: () => this.statService.setEffortComparison(stat.id, values.effortComparison),
        update: {effortComparison: values.effortComparison}});
    }
    if (values.stacked !== (stat.stacked ?? false)) {
      changes.push({request: () => this.statService.setStacked(stat.id, values.stacked),
        update: {stacked: values.stacked}});
    }
    this.chartDisplayError.set('');
    this.chartDisplaySaving.set(true);
    this.chartDisplayForm.disable();
    this.saveSequentially(stat, changes, () => {
      this.chartDisplaySaving.set(false);
      if (this.stat()?.id === stat.id) {
        this.resetChartDisplayForm(this.stat()!);
        this.chartDisplayForm.enable();
      }
    }, error => {
      this.chartDisplaySaving.set(false);
      if (this.stat()?.id === stat.id) {
        const current = this.stat()!;
        this.resetChartDisplayForm(current);
        this.chartDisplayForm.enable();
        const reason = error instanceof HttpErrorResponse && error.status === 400 && typeof error.error === 'string'
          ? error.error : 'Could not save chart display settings.';
        this.chartDisplayError.set(`${reason} The form reflects the last confirmed settings.`);
      }
    });
  }

  onXAxisSave(): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.xAxisSaving() || this.xAxisForm.invalid || this.xAxisForm.pristine) return;
    const {xAxisScaleType, xAxisUnit} = this.xAxisForm.getRawValue();
    const unit = xAxisUnit.trim();
    const previous = {xAxisScaleType: stat.xAxisScaleType ?? 'time', xAxisUnit: stat.xAxisUnit ?? ''};
    this.xAxisError.set('');
    this.xAxisSaving.set(true);
    this.xAxisForm.disable();
    this.stat.update(current => current ? {...current, xAxisScaleType, xAxisUnit: unit} : current);
    this.statService.renameAxes(stat.id, stat.xAxisName, stat.yAxisName, xAxisScaleType, unit).subscribe({
      next: () => {
        this.xAxisSaving.set(false);
        if (this.stat()?.id === stat.id) {
          this.xAxisForm.enable();
          this.xAxisForm.markAsPristine();
        }
      },
      error: error => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, ...previous} : current);
          const reason = error.status === 400 && typeof error.error === 'string'
            ? error.error : 'Could not save X-axis settings.';
          this.xAxisError.set(`${reason} The previous setting has been restored.`);
          this.xAxisForm.reset(previous);
          this.xAxisForm.enable();
        }
        this.xAxisSaving.set(false);
      }
    });
  }

  onAxisLabelsSave(): void {
    const stat = this.stat();
    if (!stat || this.axisLabelsSaving() || this.axisLabelsForm.invalid || this.axisLabelsForm.pristine) return;
    const {xAxisName, yAxisName} = this.axisLabelsForm.getRawValue();
    this.axisLabelsError.set('');
    this.axisLabelsSaving.set(true);
    this.axisLabelsForm.disable();
    this.statService.renameAxes(stat.id, xAxisName, yAxisName,
      stat.xAxisScaleType ?? 'time', stat.xAxisUnit ?? '').subscribe({
      next: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, xAxisName, yAxisName} : current);
          this.axisLabelsForm.reset({xAxisName, yAxisName});
          this.axisLabelsForm.enable();
        }
        this.axisLabelsSaving.set(false);
      },
      error: error => {
        if (this.stat()?.id === stat.id) {
          this.axisLabelsForm.reset({xAxisName: stat.xAxisName, yAxisName: stat.yAxisName});
          this.axisLabelsForm.enable();
          const reason = error.status === 400 && typeof error.error === 'string'
            ? error.error : 'Could not save axis labels.';
          this.axisLabelsError.set(`${reason} The previous labels have been restored.`);
        }
        this.axisLabelsSaving.set(false);
      }
    });
  }

  onYAxisSave(): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.yAxisSaving() || this.yAxisForm.invalid || this.yAxisForm.pristine) return;
    const values = this.yAxisForm.getRawValue();
    const changes: {request: () => Observable<void>; update: Partial<Stat>}[] = [];
    if (values.yAxisFormat !== (stat.yAxisFormat ?? 'number')) {
      changes.push({request: () => this.statService.setYAxisFormat(stat.id, values.yAxisFormat),
        update: {yAxisFormat: values.yAxisFormat}});
    }
    if (values.yAxisMin !== (stat.yAxisMin ?? null) || values.yAxisMax !== (stat.yAxisMax ?? null)) {
      changes.push({request: () => this.statService.setYAxisBounds(stat.id, values.yAxisMin, values.yAxisMax),
        update: {yAxisMin: values.yAxisMin, yAxisMax: values.yAxisMax}});
    }
    this.yAxisError.set('');
    this.yAxisSaving.set(true);
    this.yAxisForm.disable();
    this.saveSequentially(stat, changes, () => {
      this.yAxisSaving.set(false);
      if (this.stat()?.id === stat.id) {
        this.resetYAxisForm(this.stat()!);
        this.yAxisForm.enable();
      }
    }, error => {
      this.yAxisSaving.set(false);
      if (this.stat()?.id === stat.id) {
        const current = this.stat()!;
        this.resetYAxisForm(current);
        this.yAxisForm.enable();
        const reason = error instanceof HttpErrorResponse && error.status === 400 && typeof error.error === 'string'
          ? error.error : 'Could not save Y-axis settings.';
        this.yAxisError.set(`${reason} The form reflects the last confirmed settings.`);
      }
    });
  }

  private saveSequentially(
    stat: Stat,
    changes: {request: () => Observable<void>; update: Partial<Stat>}[],
    onComplete: () => void,
    onError: (error: unknown) => void
  ): void {
    from(changes).pipe(concatMap(change => change.request().pipe(tap(() => {
      if (this.stat()?.id === stat.id) {
        this.stat.update(current => current?.id === stat.id ? {...current, ...change.update} : current);
      }
    })))).subscribe({complete: onComplete, error: onError});
  }

  private resetChartDisplayForm(stat: Stat): void {
    this.chartDisplayForm.reset({
      chartType: stat.chartType ?? 'line',
      effortComparison: stat.effortComparison ?? false,
      stacked: stat.stacked ?? false
    });
  }

  private resetYAxisForm(stat: Stat): void {
    this.yAxisForm.reset({
      yAxisFormat: stat.yAxisFormat ?? 'number',
      yAxisMin: stat.yAxisMin ?? null,
      yAxisMax: stat.yAxisMax ?? null
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
