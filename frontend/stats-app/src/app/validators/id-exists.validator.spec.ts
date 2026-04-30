import {beforeEach, describe, expect, it, vi} from 'vitest';
import {idExistsValidator} from './id-exists.validator';
import {FormControl} from '@angular/forms';
import {of} from 'rxjs';
import {StatService} from '../services/stat-service';

describe('idExistsValidator', () => {

  let statServiceMock: Partial<StatService>;

  beforeEach(() => {
    statServiceMock = {
      existsById: vi.fn()
    };
  });

  it('should return idExists error when ID already exists', async () => {
    (statServiceMock.existsById as any) = vi.fn().mockReturnValue(of(true));

    const validator = idExistsValidator(statServiceMock as StatService);
    const control = new FormControl('existing-id');

    const result = await (validator(control) as any).toPromise();
    expect(result).toEqual({idExists: true});
  });

  it('should return null when ID does not exist', async () => {
    (statServiceMock.existsById as any) = vi.fn().mockReturnValue(of(false));

    const validator = idExistsValidator(statServiceMock as StatService);
    const control = new FormControl('new-id');

    const result = await (validator(control) as any).toPromise();
    expect(result).toBeNull();
  });
});
