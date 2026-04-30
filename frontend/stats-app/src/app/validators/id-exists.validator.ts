import {AbstractControl, AsyncValidatorFn, ValidationErrors} from '@angular/forms';

import {map, Observable} from 'rxjs';
import {StatService} from '../services/stat-service';

/**
 * Returns true, if id exists, and null, if not,
 */
export function idExistsValidator(statService: StatService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return statService.existsById(control.value).pipe(
      map(exists => exists ? {idExists: true} : null)
    );
  };
}
