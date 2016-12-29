import { NgModule, ApplicationRef } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { removeNgStyles, createNewHosts } from '@angularclass/hmr';

// Lucca UI modules
import { LuiProgressBarModule } from '../../src/components/progress-bar';
// import { LuiUserPickerModule } from '../../src/components/user-picker/user-picker.module';
import { LuiDatePickerModule } from '../../src/components/date-picker';
import {LuiModalModule} from '../../src/components/modal/index';

// Demo app
import { AppComponent } from './app.component';
// import { UserPickerDemoComponent } from './../components/user-picker-demo/user-picker-demo.component';
import { DatePickerDemoComponent } from './../components/date-picker-demo/date-picker-demo.component';
import { ModalDemoComponent } from '../components/modal-demo/modal-demo.component';
import { ModalContentComponent } from '../components/modal-demo/modal-content/modal-content.component';
import {ModalDisplayerInsideModalComponent} from '../components/modal-demo/modal-content/modal-displayer-inside-modal/modal-displayer-inside-modal.component';


@NgModule({
imports: [
	BrowserModule,
	HttpModule,
	FormsModule,
	LuiProgressBarModule,
	// LuiUserPickerModule,
	LuiDatePickerModule,
	LuiModalModule
],
declarations: [
	AppComponent,
	// UserPickerDemoComponent,
	DatePickerDemoComponent,
	ModalDemoComponent,
	ModalContentComponent,
	ModalDisplayerInsideModalComponent
],
entryComponents: [ModalContentComponent],
providers: [],
bootstrap: [AppComponent]
})
export class AppModule {
constructor(public appRef: ApplicationRef) {}
hmrOnInit(store) {
	console.log('HMR store', store);
}
hmrOnDestroy(store) {
	let cmpLocation = this.appRef.components.map(cmp => cmp.location.nativeElement);
	// recreate elements
	store.disposeOldHosts = createNewHosts(cmpLocation);
	// remove styles
	removeNgStyles();
}
hmrAfterDestroy(store) {
	// display new elements
	store.disposeOldHosts();
	delete store.disposeOldHosts;
}
}