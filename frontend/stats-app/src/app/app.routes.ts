import {Routes} from '@angular/router';
import {StatsList} from './stats-list/stats-list';
import {StatDetails} from './stat-details/stat-details';
import {CreateForm} from './create-form/create-form';
import {StatEdit} from './stat-edit/stat-edit';

export const routes: Routes = [
  {path: '', redirectTo: 'stats', pathMatch: 'full'},
  {path: 'stats', component: StatsList, title: 'StatsApp'},
  {path: 'stats/new', component: CreateForm, title: 'StatsApp - Create new'},
  {path: 'stats/:id', component: StatDetails, title: 'StatsApp - Details'},
  {path: 'stats/:id/edit', component: StatEdit, title: 'StatsApp - Edit'},
];
