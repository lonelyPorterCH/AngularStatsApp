import {Component, inject, OnInit, signal, viewChild} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChartComponent, ChartPointClickEvent} from '../chart/chart';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {AddPointForm} from './add-point-form/add-point-form';
import {EditDeleteForm} from './edit-delete-form/edit-delete-form';
import {ManageDatasetsForm} from './manage-datasets-form/manage-datasets-form';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatTabGroup, MatTab, AddPointForm, EditDeleteForm, ManageDatasetsForm],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
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
  tabGroup = viewChild<MatTabGroup>('tabGroup');
  editDeleteForm = viewChild<EditDeleteForm>('editDeleteForm');


  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        forkJoin({
          stat: this.statService.getStatById(id),
          archived: this.statService.isArchived(id)
        }).subscribe({
          next: result => {
            if (result.archived) {
              void this.router.navigate(['/stats', id]);
              return;
            }

            this.stat.set(result.stat);
            this.titleForm.reset({title: result.stat.title});
            this.renameError.set('');
            this.renameSaved.set(false);
            this.title.setTitle(`StatsApp - Edit ${result.stat.title}`);
          },
          error: err => {
            if (err.status === 404) {
              void this.router.navigate(['/stats', id]);
              return;
            }

            console.error(err);
          }
        });
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

  protected reloadStat(): void {
    this.statService.getStatById(this.stat()!.id).subscribe({
      next: data => {
        this.stat.set(data);
      }
    });
  }

  protected onChartPointClick(event: ChartPointClickEvent): void {
    const tabGroup = this.tabGroup();
    if (tabGroup) {
      tabGroup.selectedIndex = 2; // "Edit / Delete Point" tab
    }
    setTimeout(() => {
      this.editDeleteForm()?.prefillPoint(event.datasetLabel, event.point);
    });
  }
}
