import {Component, computed, inject, signal} from '@angular/core';
import {FormArray, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {DOCUMENT} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatSelect} from '@angular/material/select';
import {MatOption} from '@angular/material/core';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {firstValueFrom} from 'rxjs';
import {StatService} from '../services/stat-service';
import {Stat} from '../models/stat';
import {buildGraphs, CsvTable, numericValue, parseCsv, previewCsv, sharedUnit, validGraphId} from './csv-mapper';

interface SaveResult {
  status: 'pending' | 'saved' | 'failed' | 'unknown';
  message: string;
  payload?: Stat;
}

@Component({
  selector: 'app-csv-import',
  imports: [ReactiveFormsModule, RouterLink, MatButton, MatIcon, MatCheckbox, MatFormField,
    MatLabel, MatInput, MatSelect, MatOption, MatButtonToggleModule],
  templateUrl: './csv-import.html',
  styleUrl: './csv-import.scss'
})
export class CsvImport {
  private readonly builder = inject(FormBuilder);
  private readonly service = inject(StatService);
  private readonly document = inject(DOCUMENT);
  readonly table = signal<CsvTable | null>(null);
  readonly fileName = signal('');
  readonly dateColumn = signal(0);
  readonly selected = signal<number[]>([]);
  readonly separate = signal(false);
  readonly busy = signal(false);
  readonly reading = signal(false);
  readonly error = signal('');
  readonly prepared = signal(false);
  readonly results = signal<SaveResult[]>([]);
  readonly confirmed = signal(false);
  readonly preview = computed(() => {
    const table = this.table();
    return table ? previewCsv(table, this.dateColumn(), this.selected()) : null;
  });
  readonly numericColumns = computed(() => {
    const table = this.table();
    return table ? table.headers.map((label, index) => ({label, index,
      sample: table.rows.slice(0, 3).map(row => row[index] || '(empty)').join(', ')
    })).filter(column => column.index !== this.dateColumn()
      && table.rows.some(row => numericValue(row[column.index]) !== null)) : [];
  });
  readonly mixedUnits = computed(() => {
    const datasets = this.preview()?.datasets ?? [];
    return !this.separate() && datasets.length > 1 && !sharedUnit(datasets);
  });
  readonly canReview = computed(() => !!this.preview()?.datasets.length
    && this.preview()!.datasets.every(dataset => dataset.dataPoints.length > 0));
  readonly attempted = computed(() => this.results().some(result => result.status !== 'pending'));
  readonly allSaved = computed(() => !!this.results().length && this.results().every(result => result.status === 'saved'));
  readonly hasUnknown = computed(() => this.results().some(result => result.status === 'unknown'));
  readonly graphs = new FormArray<ReturnType<CsvImport['graphForm']>>([]);
  readonly form = this.builder.group({graphs: this.graphs}, {updateOn: 'blur'});

  private graphForm(stat: Stat) {
    const base = stat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'graph';
    const suffix = Array.from(globalThis.crypto.getRandomValues(new Uint32Array(2)),
      value => value.toString(16).padStart(8, '0')).join('');
    return this.builder.nonNullable.group({
      id: [`${base}-${suffix}`, [Validators.required,
        (control: {value: string}) => validGraphId(control.value) ? null : {unsafeId: true}]],
      title: [stat.title, [Validators.required, Validators.pattern(/\S/)]],
      xAxisName: [stat.xAxisName, [Validators.required, Validators.pattern(/\S/)]],
      yAxisName: [stat.yAxisName, [Validators.required, Validators.pattern(/\S/)]]
    }, {updateOn: 'blur'});
  }

  async loadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.busy() || this.attempted()) return;
    this.resetReview();
    this.table.set(null);
    this.selected.set([]);
    this.fileName.set(file.name);
    this.error.set('');
    this.reading.set(true);
    try {
      const table = parseCsv(await file.text());
      this.table.set(table);
      const dateColumn = table.headers.findIndex(header => header.toLowerCase() === 'date');
      this.dateColumn.set(dateColumn < 0 ? 0 : dateColumn);
      this.separate.set(false);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The CSV file could not be read.');
    } finally {
      this.reading.set(false);
      input.value = '';
    }
  }

  setDateColumn(column: number): void {
    this.dateColumn.set(column);
    this.selected.update(columns => columns.filter(index => index !== column));
    this.resetReview();
  }

  toggleColumn(column: number, checked: boolean): void {
    this.selected.update(columns => checked ? [...new Set([...columns, column])].sort((first, second) => first - second)
      : columns.filter(index => index !== column));
    this.resetReview();
  }

  setSeparate(value: boolean): void {
    this.separate.set(value);
    this.resetReview();
  }

  resetReview(): void {
    this.prepared.set(false);
    this.confirmed.set(false);
    this.graphs.clear();
    this.results.set([]);
    this.error.set('');
  }

  review(): void {
    if (!this.canReview()) return;
    this.graphs.clear();
    const stats = buildGraphs(this.preview()!.datasets, this.separate(), this.fileName().replace(/\.csv$/i, '') || 'Imported measurements');
    stats.forEach(stat => this.graphs.push(this.graphForm(stat)));
    this.results.set(stats.map(() => ({status: 'pending', message: 'Not saved'})));
    this.confirmed.set(false);
    this.prepared.set(true);
  }

  private payload(index: number): Stat {
    const stat = buildGraphs(this.preview()!.datasets, this.separate(), '')[index];
    const metadata = this.graphs.at(index).getRawValue();
    return {...stat, ...metadata, title: metadata.title.trim(),
      xAxisName: metadata.xAxisName.trim(), yAxisName: metadata.yAxisName.trim()};
  }

  private result(index: number, result: SaveResult): void {
    this.results.update(results => results.map((entry, entryIndex) => entryIndex === index ? result : entry));
  }

  async save(): Promise<void> {
    if (this.busy() || !this.prepared() || !this.confirmed() || this.hasUnknown() || this.allSaved()) return;
    const activeElement = this.document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    this.error.set('');
    this.form.markAllAsTouched();
    const ids = this.graphs.getRawValue().map(graph => graph.id);
    if (this.form.invalid || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {
      this.error.set('Provide valid graph details and unique IDs. IDs use letters, numbers, hyphens and underscores.');
      return;
    }
    this.busy.set(true);
    this.form.disable();
    try {
      for (let index = 0; index < this.graphs.length; index++) {
        if (this.results()[index].status === 'saved') continue;
        const payload = this.payload(index);
        let posting = false;
        try {
          try {
            await firstValueFrom(this.service.getStatById(payload.id));
            this.result(index, {status: 'failed', message: 'ID already exists. Choose a different ID.'});
            continue;
          } catch (error) {
            if (!(error instanceof HttpErrorResponse) || error.status !== 404) throw error;
          }
          posting = true;
          await firstValueFrom(this.service.addStat(payload));
          this.result(index, {status: 'saved', message: 'Saved', payload});
        } catch (error) {
          const definite = error instanceof HttpErrorResponse && [400, 409].includes(error.status);
          this.result(index, posting && !definite
            ? {status: 'unknown', message: 'Save outcome unknown. Check before retrying.', payload}
            : {status: 'failed', message: definite ? 'ID conflict or invalid graph. Review the details.'
              : 'Availability could not be checked. Nothing was submitted for this graph.'});
        }
      }
    } finally {
      this.form.enable();
      this.busy.set(false);
    }
  }

  async checkResult(index: number): Promise<void> {
    const result = this.results()[index];
    if (this.busy() || result.status !== 'unknown' || !result.payload) return;
    this.busy.set(true);
    try {
      const found = await firstValueFrom(this.service.getStatById(result.payload.id));
      const expected = result.payload;
      const matches = found.title === expected.title && found.xAxisName === expected.xAxisName
        && found.yAxisName === expected.yAxisName && found.xAxisScaleType === 'time'
        && found.reverse === expected.reverse
        && found.datasets.length === expected.datasets.length
        && found.datasets.every((dataset, datasetIndex) => {
          const intended = expected.datasets[datasetIndex];
          const ordered = [...intended.dataPoints].sort((first, second) => first.x.localeCompare(second.x));
          return dataset.label === intended.label && dataset.index === intended.index
            && dataset.dataPoints.length === ordered.length
            && dataset.dataPoints.every((point, pointIndex) => point.x === ordered[pointIndex].x && point.y === ordered[pointIndex].y);
        });
      this.result(index, matches ? {status: 'saved', message: 'Saved (verified)', payload: expected}
        : {status: 'failed', message: 'ID exists with different data. Choose a different ID.'});
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.result(index, {status: 'failed', message: 'Graph not found. Review and retry explicitly.'});
      } else {
        this.result(index, {...result, message: 'Could not verify the save. Check again when the connection is restored.'});
      }
    } finally {
      this.busy.set(false);
    }
  }
}