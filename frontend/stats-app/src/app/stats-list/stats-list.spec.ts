import {of, throwError} from 'rxjs';
import {StatsList} from './stats-list';
import {StatService} from '../services/stat-service';
import {DashboardLayout} from '../models/dashboard-layout';
import {Stat} from '../models/stat';

describe('StatsList layout editing', () => {
  const stat: Stat = {id: 'one', title: 'One', xAxisName: '', yAxisName: '', reverse: false, datasets: []};
  let original: DashboardLayout;
  let service: Pick<StatService, 'getStats' | 'getLayout' | 'saveLayout'>;
  let component: StatsList;

  beforeEach(() => {
    original = {groups: [
      {id: 'ungrouped', title: 'Ungrouped', charts: []},
      {id: 'group', title: 'Group', charts: [{statisticId: 'one', x: 6, y: 0, width: 6, height: 4}]}
    ]};
    service = {getStats: () => of([stat]), getLayout: () => of(structuredClone(original)), saveLayout: () => of(undefined)};
    component = new StatsList(service as StatService);
    component.ngOnInit();
  });

  it('moves charts to ungrouped when deleting a group and can cancel the edit', () => {
    component.startEditing();
    component.deleteGroup('group');
    expect(component.layout()?.groups).toHaveLength(1);
    expect(component.layout()?.groups[0].charts[0]).toMatchObject({statisticId: 'one', x: 0, y: 0});
    component.cancelEditing();
    expect(component.layout()).toEqual(original);
  });

  it('keeps unsaved edits when saving fails', () => {
    service.saveLayout = () => throwError(() => new Error('offline'));
    component.startEditing();
    component.renameGroup('group', 'Changed');
    component.save();
    expect(component.editing()).toBe(true);
    expect(component.layout()?.groups[1].title).toBe('Changed');
    expect(component.error()).toContain('Could not save');
  });

  it('initializes missing charts in the ungrouped section and saves the layout', () => {
    original.groups[1].charts = [];
    const saved: DashboardLayout[] = [];
    service.saveLayout = layout => { saved.push(structuredClone(layout)); return of(undefined); };
    component = new StatsList(service as StatService);
    component.ngOnInit();
    expect(saved[0].groups[0].charts[0]).toMatchObject({statisticId: 'one', x: 0, y: 0});
    expect(component.layout()).toEqual(saved[0]);
  });

  it('keeps charts large enough to display when resizing smaller', () => {
    component.startEditing();
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    const handle = document.createElement('button');
    grid.appendChild(handle);
    handle.setPointerCapture = () => {};
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 100);
    const down = new MouseEvent('pointerdown', {clientX: 500, clientY: 500}) as PointerEvent;
    Object.defineProperties(down, {currentTarget: {value: handle}, pointerId: {value: 1}});
    component.startResize(down, 'group', component.layout()!.groups[1].charts[0]);
    component.resizeChart(new MouseEvent('pointermove', {clientX: 0, clientY: 0}) as PointerEvent);
    expect(component.layout()!.groups[1].charts[0]).toMatchObject({width: 2, height: 3});
    component.stopResize();
  });
});
