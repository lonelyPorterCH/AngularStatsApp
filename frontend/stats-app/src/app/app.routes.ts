import {Routes} from '@angular/router';
import {StatsList} from './stats-list/stats-list';
import {StatDetails} from './stat-details/stat-details';
import {CreateForm} from './create-form/create-form';
import {StatEdit} from './stat-edit/stat-edit';
import {Archive} from './archive/archive';
import {ScoreComparison} from './score-comparison/score-comparison';
import {HarvestTracker} from './harvest-tracker/harvest-tracker';

export const routes: Routes = [
  {path: '', redirectTo: 'stats', pathMatch: 'full'},
  {path: 'stats', component: StatsList, title: 'StatsApp'},
  {path: 'archive', component: Archive, title: 'StatsApp - Archive'},
  {path: 'stats/new', component: CreateForm, title: 'StatsApp - Create new'},
  {path: 'stats/:id', component: StatDetails, title: 'StatsApp - Details'},
  {path: 'stats/:id/edit', component: StatEdit, title: 'StatsApp - Edit'},
  {path: 'scores', component: ScoreComparison, title: 'StatsApp - Score Comparison'},
  {path: 'harvest', component: HarvestTracker, title: 'StatsApp - Harvest Tracker'},
];
