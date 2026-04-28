import {Component, OnInit, signal} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DataPoint, Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChartComponent} from '../chart/chart';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatDatepickerInput, MatDatepickerToggle, MatDatepicker],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
})
export class StatEdit implements OnInit {

  stat = signal<Stat | undefined>(undefined);
  addPointForm!: FormGroup;

  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private title: Title
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.statService.getStatById(id).subscribe({
          next: data => {
            this.stat.set(data);
            this.title.setTitle(`StatsApp - Edit ${data.title}`);
          }
        });
      }
    });

    this.addPointForm = this.formBuilder.group({
      x: ['', Validators.required],
      y: ['', Validators.required]
    }, {updateOn: 'blur'});
  }

  onAddPoint(): void {
    if (this.addPointForm.invalid || !this.stat()) return;

    const newPoint: DataPoint = {
      x: this.addPointForm.get('x')?.value,
      y: this.addPointForm.get('y')?.value
    };

    this.statService.addDataPoint(this.stat()!.id, newPoint).subscribe({
      next: () => {
        // reload the stat so the chart updates
        this.statService.getStatById(this.stat()!.id).subscribe({
          next: data => {
            this.stat.set(data);
            this.addPointForm.reset();
          }
        });
      },
      error: err => console.error(err)
    });
  }
}
