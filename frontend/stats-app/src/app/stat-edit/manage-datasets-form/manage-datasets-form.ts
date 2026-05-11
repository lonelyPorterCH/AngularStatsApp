import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatList, MatListItem} from '@angular/material/list';

@Component({
  selector: 'app-manage-datasets-form',
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatIconButton,
    MatIcon,
    MatList,
    MatListItem
  ],
  templateUrl: './manage-datasets-form.html',
  styleUrl: './manage-datasets-form.css'
})
export class ManageDatasetsForm implements OnInit {

  @Input() stat!: Stat;
  @Output() datasetsChanged = new EventEmitter<void>();

  addDatasetForm!: FormGroup;

  constructor(
    private statService: StatService,
    private formBuilder: FormBuilder
  ) {
  }

  ngOnInit(): void {
    this.addDatasetForm = this.formBuilder.group({
      label: ['', Validators.required]
    }, {updateOn: 'blur'});
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
}

