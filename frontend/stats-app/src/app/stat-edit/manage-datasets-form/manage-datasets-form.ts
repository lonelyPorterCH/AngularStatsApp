import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Dataset, Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatList, MatListItem} from '@angular/material/list';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
  selector: 'app-manage-datasets-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIconButton,
    MatIcon,
    MatList,
    MatListItem,
    MatCheckbox
  ],
  templateUrl: './manage-datasets-form.html',
  styleUrl: './manage-datasets-form.css'
})
export class ManageDatasetsForm implements OnInit, OnChanges {

  @Input() stat!: Stat;
  @Output() datasetsChanged = new EventEmitter<void>();

  addDatasetForm!: FormGroup;
  axesForm!: FormGroup;

  // Map of dataset label -> rename input value (undefined = not editing)
  editingDataset: Record<string, string | undefined> = {};

  constructor(
    private statService: StatService,
    private formBuilder: FormBuilder
  ) {
  }

  ngOnInit(): void {
    this.addDatasetForm = this.formBuilder.group({
      label: ['', Validators.required]
    }, {updateOn: 'blur'});

    this.axesForm = this.formBuilder.group({
      xAxisName: [this.stat.xAxisName, Validators.required],
      yAxisName: [this.stat.yAxisName, Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stat'] && this.axesForm) {
      this.axesForm.patchValue({
        xAxisName: this.stat.xAxisName,
        yAxisName: this.stat.yAxisName
      });
    }
  }

  onAddDataset(): void {
    if (this.addDatasetForm.invalid || !this.stat) return;

    const label: string = this.addDatasetForm.get('label')?.value;
    this.statService.addDataset(this.stat.id, label).subscribe({
      next: () => {
        this.datasetsChanged.emit();
        this.addDatasetForm.reset();
      },
      error: err => console.error(err)
    });
  }

  onDeleteDataset(label: string): void {
    this.statService.deleteDataset(this.stat.id, label).subscribe({
      next: () => this.datasetsChanged.emit(),
      error: err => console.error(err)
    });
  }

  startRenameDataset(label: string): void {
    this.editingDataset[label] = label;
  }

  cancelRenameDataset(label: string): void {
    delete this.editingDataset[label];
  }

  onRenameDataset(oldLabel: string): void {
    const newLabel = this.editingDataset[oldLabel]?.trim();
    if (!newLabel || newLabel === oldLabel) {
      this.cancelRenameDataset(oldLabel);
      return;
    }
    this.statService.renameDataset(this.stat.id, oldLabel, newLabel).subscribe({
      next: () => {
        delete this.editingDataset[oldLabel];
        this.datasetsChanged.emit();
      },
      error: err => console.error(err)
    });
  }

  onRenameAxes(): void {
    if (this.axesForm.invalid) return;
    const {xAxisName, yAxisName} = this.axesForm.value;
    this.statService.renameAxes(this.stat.id, xAxisName, yAxisName).subscribe({
      next: () => this.datasetsChanged.emit(),
      error: err => console.error(err)
    });
  }

  get sortedDatasets(): Dataset[] {
    return [...this.stat.datasets].sort((a, b) => a.index - b.index);
  }

  moveDatasetUp(label: string): void {
    const sorted = this.sortedDatasets;
    const idx = sorted.findIndex(ds => ds.label === label);
    if (idx <= 0) return;
    // Swap with the one above
    const newOrder = sorted.map(ds => ds.label);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    this.statService.reorderDatasets(this.stat.id, newOrder).subscribe({
      next: () => this.datasetsChanged.emit(),
      error: err => console.error(err)
    });
  }

  moveDatasetDown(label: string): void {
    const sorted = this.sortedDatasets;
    const idx = sorted.findIndex(ds => ds.label === label);
    if (idx < 0 || idx >= sorted.length - 1) return;
    // Swap with the one below
    const newOrder = sorted.map(ds => ds.label);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    this.statService.reorderDatasets(this.stat.id, newOrder).subscribe({
      next: () => this.datasetsChanged.emit(),
      error: err => console.error(err)
    });
  }

  onSetDatasetFilled(label: string, filled: boolean): void {
    this.statService.setDatasetFilled(this.stat.id, label, filled).subscribe({
      next: () => this.datasetsChanged.emit(),
      error: err => console.error(err)
    });
  }
}

