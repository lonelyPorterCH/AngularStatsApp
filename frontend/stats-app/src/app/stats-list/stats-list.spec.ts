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
    original = {charts: [], groups: [
      {id: 'group', title: 'Group', charts: [{statisticId: 'one', x: 6, y: 0, width: 6, height: 4}]}
    ]};
    service = {getStats: () => of([stat]), getLayout: () => of(structuredClone(original)), saveLayout: () => of(undefined)};
    component = new StatsList(service as StatService);
    component.ngOnInit();
  });

  it('moves charts to ungrouped when deleting a group and can cancel the edit', () => {
    component.startEditing();
    component.deleteGroup('group');
    expect(component.layout()?.groups).toHaveLength(0);
    expect(component.layout()?.charts[0]).toMatchObject({statisticId: 'one', x: 6, y: 0});
    component.cancelEditing();
    expect(component.layout()).toEqual(original);
  });

  it('preserves a deleted group’s arrangement below existing ungrouped charts', () => {
    original.charts.push({statisticId: 'other', x: 0, y: 0, width: 6, height: 4});
    original.groups[0].charts.push({statisticId: 'third', x: 0, y: 0, width: 6, height: 4});
    component.layout.set(structuredClone(original));
    component.startEditing();
    component.deleteGroup('group');
    expect(component.layout()?.charts).toEqual([
      {statisticId: 'other', x: 0, y: 0, width: 6, height: 4},
      {statisticId: 'one', x: 6, y: 4, width: 6, height: 4},
      {statisticId: 'third', x: 0, y: 4, width: 6, height: 4}
    ]);
  });

  it('keeps unsaved edits when saving fails', () => {
    service.saveLayout = () => throwError(() => new Error('offline'));
    component.startEditing();
    component.renameGroup('group', 'Changed');
    component.save();
    expect(component.editing()).toBe(true);
    expect(component.layout()?.groups[0].title).toBe('Changed');
    expect(component.error()).toContain('Could not save');
  });

  it('previews a cross-group move and displaced charts without changing the saved layout until drop', () => {
    original.charts.push({statisticId: 'other', x: 0, y: 0, width: 6, height: 4});
    component.layout.set(structuredClone(original));
    component.startEditing();
    const card = document.createElement('div');
    card.className = 'dashboard-chart';
    const handle = document.createElement('div');
    card.appendChild(handle);
    card.getBoundingClientRect = () => new DOMRect(100, 100, 600, 448);
    const dataTransfer = {setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: ''};
    const start = new MouseEvent('dragstart', {clientX: 150, clientY: 110}) as DragEvent;
    Object.defineProperties(start, {currentTarget: {value: handle}, dataTransfer: {value: dataTransfer}});
    component.dragStart(start, 'group', component.layout()!.groups[0].charts[0]);

    const grid = document.createElement('div');
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const over = new MouseEvent('dragover', {clientX: 50, clientY: 10, cancelable: true}) as DragEvent;
    Object.defineProperty(over, 'currentTarget', {value: grid});
    component.previewDrop(over, null, component.layout()!.charts);
    expect(over.defaultPrevented).toBe(true);
    expect(component.dragPreview()?.chart).toMatchObject({statisticId: 'one', x: 0, y: 0, width: 6, height: 4});
    expect(component.dragPreview()?.charts.find(chart => chart.statisticId === 'other')?.y).toBe(4);
    expect(component.layout()).toEqual(original);

    const drop = new MouseEvent('drop', {cancelable: true}) as DragEvent;
    component.drop(drop, null);
    expect(drop.defaultPrevented).toBe(true);
    expect(component.layout()!.charts).toEqual([
      {statisticId: 'one', x: 0, y: 0, width: 6, height: 4},
      {statisticId: 'other', x: 0, y: 4, width: 6, height: 4}
    ]);
    expect(component.layout()!.groups[0].charts).toEqual([]);
    expect(component.dragPreview()).toBeNull();
  });

  it('clears a cancelled drag without changing placements', () => {
    component.startEditing();
    const card = document.createElement('div');
    card.className = 'dashboard-chart';
    const handle = document.createElement('div');
    card.appendChild(handle);
    const start = new MouseEvent('dragstart') as DragEvent;
    Object.defineProperties(start, {currentTarget: {value: handle},
      dataTransfer: {value: {setData: vi.fn(), setDragImage: vi.fn()}}});
    component.dragStart(start, 'group', component.layout()!.groups[0].charts[0]);
    const grid = document.createElement('div');
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const over = new MouseEvent('dragover', {cancelable: true}) as DragEvent;
    Object.defineProperty(over, 'currentTarget', {value: grid});
    component.previewDrop(over, null, component.layout()!.charts);
    expect(component.dragPreview()).not.toBeNull();
    component.dragEnd();
    expect(component.dragPreview()).toBeNull();
    expect(component.layout()).toEqual(original);
  });

  it('moves a chart from the dashboard into a group', () => {
    original.charts.push(original.groups[0].charts.pop()!);
    component.layout.set(structuredClone(original));
    component.startEditing();
    const card = document.createElement('div');
    card.className = 'dashboard-chart';
    const handle = document.createElement('div');
    card.appendChild(handle);
    const start = new MouseEvent('dragstart') as DragEvent;
    Object.defineProperties(start, {currentTarget: {value: handle},
      dataTransfer: {value: {setData: vi.fn(), setDragImage: vi.fn()}}});
    component.dragStart(start, null, component.layout()!.charts[0]);
    const grid = document.createElement('div');
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const over = new MouseEvent('dragover', {cancelable: true}) as DragEvent;
    Object.defineProperty(over, 'currentTarget', {value: grid});
    component.previewDrop(over, 'group', component.layout()!.groups[0].charts);
    component.drop(new MouseEvent('drop', {cancelable: true}) as DragEvent, 'group');
    expect(component.layout()!.charts).toEqual([]);
    expect(component.layout()!.groups[0].charts[0]).toMatchObject({statisticId: 'one', x: 0, y: 0});
  });

  it('keeps the dragged card in its original DOM order while previewing collisions in its group', () => {
    component.stats.set([stat, {...stat, id: 'other', title: 'Other'}]);
    original.groups[0].charts.unshift({statisticId: 'other', x: 0, y: 0, width: 6, height: 4});
    component.layout.set(structuredClone(original));
    component.startEditing();
    const card = document.createElement('div');
    card.className = 'dashboard-chart';
    const handle = document.createElement('div');
    card.appendChild(handle);
    card.getBoundingClientRect = () => new DOMRect(600, 0, 600, 448);
    const start = new MouseEvent('dragstart', {clientX: 620, clientY: 10}) as DragEvent;
    Object.defineProperties(start, {currentTarget: {value: handle},
      dataTransfer: {value: {setData: vi.fn(), setDragImage: vi.fn()}}});
    component.dragStart(start, 'group', component.layout()!.groups[0].charts[1]);
    const grid = document.createElement('div');
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const over = new MouseEvent('dragover', {clientX: 20, clientY: 10, cancelable: true}) as DragEvent;
    Object.defineProperty(over, 'currentTarget', {value: grid});
    component.previewDrop(over, 'group', component.layout()!.groups[0].charts);
    expect(component.visibleCharts(component.layout()!.groups[0].charts, 'group')).toEqual([
      {statisticId: 'other', x: 0, y: 4, width: 6, height: 4},
      {statisticId: 'one', x: 6, y: 0, width: 6, height: 4}
    ]);
    component.drop(new MouseEvent('drop', {cancelable: true}) as DragEvent, 'group');
    expect(component.layout()!.groups[0].charts).toEqual([
      {statisticId: 'one', x: 0, y: 0, width: 6, height: 4},
      {statisticId: 'other', x: 0, y: 4, width: 6, height: 4}
    ]);
  });

  it('initializes missing charts in the ungrouped section and saves the layout', () => {
    original.groups[0].charts = [];
    const saved: DashboardLayout[] = [];
    service.saveLayout = layout => { saved.push(structuredClone(layout)); return of(undefined); };
    component = new StatsList(service as StatService);
    component.ngOnInit();
    expect(saved[0].charts[0]).toMatchObject({statisticId: 'one', x: 0, y: 0});
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
    component.startResize(down, 'group', component.layout()!.groups[0].charts[0]);
    component.resizeChart(new MouseEvent('pointermove', {clientX: 0, clientY: 0}) as PointerEvent);
    expect(component.resizePreview()?.chart).toMatchObject({width: 2, height: 3});
    expect(component.layout()).toEqual(original);
    component.stopResize();
    expect(component.layout()!.groups[0].charts[0]).toMatchObject({width: 2, height: 3});
    expect(component.placementPreview()).toBeNull();
  });

  it('previews collision displacement during resizing and discards cancelled changes', () => {
    original.groups[0].charts.push({statisticId: 'other', x: 6, y: 4, width: 6, height: 4});
    component.layout.set(structuredClone(original));
    component.stats.set([stat, {...stat, id: 'other'}]);
    component.startEditing();
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    const handle = document.createElement('button');
    grid.appendChild(handle);
    handle.setPointerCapture = () => {};
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 100);
    const down = new MouseEvent('pointerdown', {clientX: 500, clientY: 500}) as PointerEvent;
    Object.defineProperties(down, {currentTarget: {value: handle}, pointerId: {value: 1}});
    component.startResize(down, 'group', component.layout()!.groups[0].charts[0]);
    component.resizeChart(new MouseEvent('pointermove', {clientX: 500, clientY: 616}) as PointerEvent);
    expect(component.resizePreview()?.chart.height).toBe(5);
    expect(component.visibleCharts(component.layout()!.groups[0].charts, 'group')).toEqual([
      {statisticId: 'one', x: 6, y: 0, width: 6, height: 4},
      {statisticId: 'other', x: 6, y: 5, width: 6, height: 4}
    ]);
    expect(component.layout()).toEqual(original);
    component.cancelResize();
    expect(component.layout()).toEqual(original);
    expect(component.placementPreview()).toBeNull();
  });

  it('resizes the visible chart by exact pixels before snapping to the preview on release', () => {
    component.startEditing();
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    const handle = document.createElement('button');
    grid.appendChild(handle);
    handle.setPointerCapture = () => {};
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const down = new MouseEvent('pointerdown', {clientX: 500, clientY: 500}) as PointerEvent;
    Object.defineProperties(down, {currentTarget: {value: handle}, pointerId: {value: 1}});
    component.startResize(down, 'group', component.layout()!.groups[0].charts[0]);
    const initialWidth = component.liveChart()!.width;
    component.resizeChart(new MouseEvent('pointermove', {clientX: 483, clientY: 517}) as PointerEvent);
    expect(component.liveChart()!.width).toBeCloseTo(initialWidth - 17);
    expect(component.liveChart()!.height).toBe(465);
    expect(component.resizePreview()?.chart).toMatchObject({width: 6, height: 4});
    component.resizeChart(new MouseEvent('pointermove', {clientX: 450, clientY: 570}) as PointerEvent);
    expect(component.liveChart()!.width).toBeCloseTo(initialWidth - 50);
    expect(component.liveChart()!.height).toBe(518);
    const preview = structuredClone(component.resizePreview()!.charts);
    expect(component.layout()).toEqual(original);
    component.stopResize();
    expect(component.layout()!.groups[0].charts).toEqual(preview);
    expect(component.liveChart()).toBeNull();
  });

  it('moves the visible chart with the pointer without snapping until drop', () => {
    component.startEditing();
    const card = document.createElement('div');
    card.className = 'dashboard-chart';
    const handle = document.createElement('div');
    card.appendChild(handle);
    card.getBoundingClientRect = () => new DOMRect(100, 100, 600, 448);
    const start = new MouseEvent('dragstart', {clientX: 137, clientY: 110}) as DragEvent;
    Object.defineProperties(start, {currentTarget: {value: handle},
      dataTransfer: {value: {setData: vi.fn(), setDragImage: vi.fn()}}});
    component.dragStart(start, 'group', component.layout()!.groups[0].charts[0]);
    component.moveChart(new MouseEvent('drag', {clientX: 154, clientY: 133}) as DragEvent);
    expect(component.liveChart()).toEqual({id: 'one', left: 117, top: 123, width: 600, height: 448});
    const grid = document.createElement('div');
    grid.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 448);
    const over = new MouseEvent('dragover', {clientX: 166, clientY: 139, cancelable: true}) as DragEvent;
    Object.defineProperty(over, 'currentTarget', {value: grid});
    component.previewDrop(over, null, component.layout()!.charts);
    expect(component.liveChart()).toMatchObject({left: 129, top: 129});
    expect(component.dragPreview()?.chart).toMatchObject({x: 1, y: 1});
    expect(component.layout()).toEqual(original);
    component.drop(new MouseEvent('drop', {cancelable: true}) as DragEvent, null);
    expect(component.layout()!.charts[0]).toMatchObject({x: 1, y: 1});
    expect(component.liveChart()).toBeNull();
  });
});
