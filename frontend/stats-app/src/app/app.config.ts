import {ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient} from '@angular/common/http';
import {registerLocaleData} from '@angular/common';
import localeDeCh from '@angular/common/locales/de-CH'
import {MAT_DATE_LOCALE} from '@angular/material/core';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';

registerLocaleData(localeDeCh)

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideLuxonDateAdapter(),
    {provide: LOCALE_ID, useValue: 'de-CH'},
    {provide: MAT_DATE_LOCALE, useValue: 'de-CH'},
  ]
};
