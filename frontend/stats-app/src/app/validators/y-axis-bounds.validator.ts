import {AbstractControl, ValidationErrors} from '@angular/forms';

export function yAxisBoundsValidator(control: AbstractControl): ValidationErrors | null {
  const {yAxisMin: min, yAxisMax: max} = control.value;
  if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) {
    return {yAxisBounds: 'Y-axis bounds must be finite numbers.'};
  }
  return min != null && max != null && min >= max
    ? {yAxisBounds: 'Y-axis minimum must be less than maximum.'} : null;
}
