import {Routes} from '@angular/router';
import {StatsList} from './stats-list/stats-list';
import {StatDetails} from './stat-details/stat-details';

export const routes: Routes = [
  {path: '', redirectTo: 'stats', pathMatch: 'full'},
  {path: 'stats', component: StatsList},
  {path: 'stats/:id', component: StatDetails},
];
