///<reference path="../../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="Utils.ts" />

module wx {
    /**
    * ReactiveUI's awesome ReactiveList ported to Typescript (including tests)
    * @class
    */
    class ObservableList<T> implements IObservableList<T>, IUnknown, Rx.IDisposable {
        constructor(initialContents?: Array<T>, resetChangeThreshold: number = 0.3 /*, scheduler: Rx.IScheduler = null */) {
            this.setupRx(initialContents, resetChangeThreshold /*, scheduler */);
        }

        ////////////////////
        /// IUnknown

        public queryInterface(iid: string) {
            if (iid === IID.IUnknown ||
                iid === IID.IDisposable ||
                iid === IID.IObservableList ||
                iid === IID.IReadOnlyList ||
                iid === IID.IList)
                return true;

            return false;
        }

        //////////////////////////////////
        // IDisposable implementation

        public dispose(): void {
            this.clearAllPropertyChangeWatchers();
        }

        ////////////////////
        /// IObservableList<T>

        public get isReadOnly(): boolean {
            return false;
        }

        public get itemsAdded(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._itemsAdded)
                this._itemsAdded = this.itemsAddedSubject.value.asObservable();

            return this._itemsAdded;
        }

        public get beforeItemsAdded(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._beforeItemsAdded)
                this._beforeItemsAdded = this.beforeItemsAddedSubject.value.asObservable();

            return this._beforeItemsAdded;
        }

        public get itemsRemoved(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._itemsRemoved)
                this._itemsRemoved = this.itemsRemovedSubject.value.asObservable();

            return this._itemsRemoved;
        }

        public get beforeItemsRemoved(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._beforeItemsRemoved)
                this._beforeItemsRemoved = this.beforeItemsRemovedSubject.value.asObservable();

            return this._beforeItemsRemoved;
        }

        public get itemReplaced(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._itemReplaced)
                this._itemReplaced = this.itemReplacedSubject.value.asObservable();

            return this._itemReplaced;
        }

        public get beforeItemReplaced(): Rx.Observable<IAddReplaceRemoveInfo<T>> {
            if (!this._beforeItemReplaced)
                this._beforeItemReplaced = this.beforeItemReplacedSubject.value.asObservable();

            return this._beforeItemReplaced;
        }

        public get beforeItemsMoved(): Rx.Observable<IMoveInfo<T>> {
            if (!this._beforeItemsMoved)
                this._beforeItemsMoved = this.beforeItemsMovedSubject.value.asObservable();

            return this._beforeItemsMoved;
        }

        public get itemsMoved(): Rx.Observable<IMoveInfo<T>> {
            if (!this._itemsMoved)
                this._itemsMoved = this.itemsMovedSubject.value.asObservable();

            return this._itemsMoved;
        }

        public get changing(): Rx.Observable<boolean> {
            if (!this._changing)
                this._changing = this.changingSubject.asObservable();

            return this._changing;
        }

        public get changed(): Rx.Observable<boolean> {
            if (!this._changed)
                this._changed = this.changedSubject.asObservable();

            return this._changed;
        }

        public get countChanging(): Rx.Observable<number> {
            if (!this._countChanging)
                this._countChanging = this.changing.select(_ => this.inner.length).distinctUntilChanged();

            return this._countChanging;
        }

        public get countChanged(): Rx.Observable<number> {
            if (!this._countChanged)
                this._countChanged = this.changed.select(_ => this.inner.length).distinctUntilChanged();

            return this._countChanged;
        }

        public isEmptyChanged: Rx.Observable<boolean>;

        public get itemChanging(): Rx.Observable<IPropertyChangedEventArgs> {
            if (!this._itemChanging)
                this._itemChanging = this.itemChangingSubject.value.asObservable();

            return this._itemChanging;
        }

        public get itemChanged(): Rx.Observable<IPropertyChangedEventArgs> {
            if (!this._itemChanged)
                this._itemChanged = this.itemChangedSubject.value.asObservable();

            return this._itemChanged;
        }

        public get shouldReset(): Rx.Observable<any> {
            return this.refcountSubscribers(this.changed.selectMany(x =>
                !x ? Rx.Observable.empty<any>() :
                    Rx.Observable.return(null)), x => this.resetSubCount += x);
        }

        public get changeTrackingEnabled(): boolean {
            return this.propertyChangeWatchers != null;
        }

        public set changeTrackingEnabled(newValue: boolean) {
            if (this.propertyChangeWatchers != null && newValue)
                return;
            if (this.propertyChangeWatchers == null && !newValue)
                return;

            if (newValue) {
                this.propertyChangeWatchers = {};
                this.inner.forEach(x=> this.addItemToPropertyTracking(x));
            } else {
                this.clearAllPropertyChangeWatchers();
                this.propertyChangeWatchers = null;
            }
        }

        public get length(): number {
            return this.inner.length;
        }

        public addRange(items: T[]): void {
            if (items == null) {
                internal.throwError("items");
            }

            var disp = this.isLengthAboveResetThreshold(items.length) ? this.suppressChangeNotifications() : Rx.Disposable.empty;

            using(disp, () => {
                // reset notification
                if (!this.areChangeNotificationsEnabled()) {

                    // this._inner.splice(this._inner.length, 0, items)
                    Array.prototype.splice.apply(this.inner, (<T[]><any>[this.inner.length, 0]).concat(items));

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.addItemToPropertyTracking(x);
                        });
                    }
                }
                // range notification
                else if (true) /* if (wx.App.SupportsRangeNotifications) */ {
                    this.changingSubject.onNext(false);

                    if (this.beforeItemsAddedSubject.isValueCreated) {
                        this.beforeItemsAddedSubject.value.onNext({ items: items, index: this.inner.length });
                    }

                    Array.prototype.splice.apply(this.inner, (<T[]><any>[this.inner.length, 0]).concat(items));
                    this.changedSubject.onNext(false);

                    if (this.itemsAddedSubject.isValueCreated) {
                        this.itemsAddedSubject.value.onNext({ items: items, index: this.inner.length });
                    }

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.addItemToPropertyTracking(x);
                        });
                    }
                } else {
                    items.forEach(x => {
                        this.add(x);
                    });
                }

            });
        }
        
        public insertRange(index: number, items: T[]): void {
            if (items == null) {
                internal.throwError("collection");
            }

            if (index > this.inner.length) {
                internal.throwError("index");
            }

            var disp = this.isLengthAboveResetThreshold(items.length) ? this.suppressChangeNotifications() : Rx.Disposable.empty;

            using(disp, () => {
                // reset notification
                if (!this.areChangeNotificationsEnabled()) {

                    // this._inner.splice(index, 0, items)
                    Array.prototype.splice.apply(this.inner, (<T[]><any>[index, 0]).concat(items));

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.addItemToPropertyTracking(x);
                        });
                    }
                }
                // range notification
                else if (true) /* if (wx.App.SupportsRangeNotifications) */ {
                    this.changingSubject.onNext(false);

                    if (this.beforeItemsAddedSubject.isValueCreated) {
                        items.forEach(x => {
                            this.beforeItemsAddedSubject.value.onNext({ items: items, index: index });
                        });
                    }

                    Array.prototype.splice.apply(this.inner, (<T[]><any>[index, 0]).concat(items));
                    this.changedSubject.onNext(false);

                    if (this.itemsAddedSubject.isValueCreated) {
                        items.forEach(x => {
                            this.itemsAddedSubject.value.onNext({ items: items, index: index });
                        });
                    }

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.addItemToPropertyTracking(x);
                        });
                    }
                } else {
                    items.forEach(x => {
                        this.add(x);
                    });
                }

            });
        }
        
        public removeAll(items: T[]): void {
            if (items == null) {
                internal.throwError("items");
            }

            var disp = this.isLengthAboveResetThreshold(items.length) ?
                this.suppressChangeNotifications() : Rx.Disposable.empty;

            using(disp, () => {
                // NB: If we don't do this, we'll break Collection<T>'s
                // accounting of the length
                items.forEach(x => this.remove(x));
            });
        }

        public removeRange(index: number, count: number): void {
            var disp = this.isLengthAboveResetThreshold(count) ? this.suppressChangeNotifications() : Rx.Disposable.empty;

            using(disp, () => {
                // construct items
                var items: T[] = this.inner.slice(index, index + count);

                // reset notification
                if (!this.areChangeNotificationsEnabled()) {

                    this.inner.splice(index, count);

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.removeItemFromPropertyTracking(x);
                        });
                    }
                }
                // range notification
                else if (true) /* if (wx.App.SupportsRangeNotifications) */ {
                    this.changingSubject.onNext(false);

                    if (this.beforeItemsRemovedSubject.isValueCreated) {
                        items.forEach(x => {
                            this.beforeItemsRemovedSubject.value.onNext({ items: items, index: index });
                        });
                    }

                    this.inner.splice(index, count);
                    this.changedSubject.onNext(false);

                    if (this.changeTrackingEnabled) {
                        items.forEach(x => {
                            this.removeItemFromPropertyTracking(x);
                        });
                    }

                    if (this.itemsRemovedSubject.isValueCreated) {
                        items.forEach(x => {
                            this.itemsRemovedSubject.value.onNext({ items: items, index: index });
                        });
                    }
                } else {
                    items.forEach(x => {
                        this.remove(x);
                    });
                }

            });
        }

        public sort(comparison: (a: T, b: T) => number): void {
            this.inner.sort(comparison);

            this.publishResetNotification();            
        }

        public toArray(): Array<T> {
            return this.inner;
        }

        public reset(): void {
            this.publishResetNotification();
        }

        public add(item: T): void {
            this.insertItem(this.inner.length, item);            
        }

        public clear(): void {
            this.clearItems();
        }

        public contains(item: T): boolean {
            return this.inner.indexOf(item) !== -1;
        }

        public remove(item: T): boolean {
            var index = this.inner.indexOf(item);
            if (index === -1)
                return false;

            this.removeItem(index);
            return true;
        }

        public indexOf(item: T): number {
            return this.inner.indexOf(item);
        }

        public insert(index: number, item: T): void {
            this.insertItem(index, item);
        }

        public removeAt(index: number): void {
            this.removeItem(index);
        }

        public move(oldIndex, newIndex): void  {
            this.moveItem(oldIndex, newIndex);
        }

        public suppressChangeNotifications(): Rx.IDisposable {
            this.changeNotificationsSuppressed++;

            if (!this.hasWhinedAboutNoResetSub && this.resetSubCount === 0 && !utils.isInUnitTest()) {
                console.log("suppressChangeNotifications was called (perhaps via addRange), yet you do not have a subscription to shouldReset. This probably isn't what you want, as itemsAdded and friends will appear to 'miss' items");
                this.hasWhinedAboutNoResetSub = true;
            }

            return Rx.Disposable.create(() => {
                this.changeNotificationsSuppressed--;

                if (this.changeNotificationsSuppressed === 0)
                    this.publishResetNotification();
            });
        }

        public get(index: number): T {
            return this.inner[index];
        }

        public get isEmpty(): boolean {
            return this.inner.length === 0;
        }

        //////////////////////////
        // Expose some array convenience members

        public forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
            this.inner.forEach(callbackfn, thisArg);
        }

        public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
            return this.inner.map(callbackfn, thisArg);
        }

        public filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] {
            return this.inner.filter(callbackfn, thisArg);
        }

        public some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
            return this.inner.some(callbackfn, thisArg);
        }

        public every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
            return this.inner.every(callbackfn, thisArg);
        }

        ////////////////////
        // Implementation

        private changingSubject: Rx.Subject<boolean>;
        private changedSubject: Rx.Subject<boolean>;
        private inner: Array<T>;
        private beforeItemsAddedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private itemsAddedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private beforeItemsRemovedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private itemsRemovedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private beforeItemReplacedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private itemReplacedSubject: Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>;
        private itemChangingSubject: Lazy<Rx.Subject<IPropertyChangedEventArgs>>;
        private itemChangedSubject: Lazy<Rx.Subject<IPropertyChangedEventArgs>>;
        private beforeItemsMovedSubject: Lazy<Rx.Subject<IMoveInfo<T>>>;
        private itemsMovedSubject: Lazy<Rx.Subject<IMoveInfo<T>>>;
        private changeNotificationsSuppressed: number = 0;
        private propertyChangeWatchers: { [uniqueObjectId: string]: RefCountDisposeWrapper } = null;
        private resetChangeThreshold = 0;
        private resetSubCount = 0;
        private hasWhinedAboutNoResetSub = false;

        // backing-fields for subjects exposed as observables
        private _itemsAdded: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _beforeItemsAdded: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _itemsRemoved: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _beforeItemsRemoved: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _beforeItemsMoved: Rx.Observable<IMoveInfo<T>>;
        private _itemReplaced: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _beforeItemReplaced: Rx.Observable<IAddReplaceRemoveInfo<T>>;
        private _itemsMoved: Rx.Observable<IMoveInfo<T>>;
        private _changing: Rx.Observable<boolean>;
        private _changed: Rx.Observable<boolean>;
        private _countChanging: Rx.Observable<number>;
        private _countChanged: Rx.Observable<number>;
        private _itemChanging: Rx.Observable<IPropertyChangedEventArgs>;
        private _itemChanged: Rx.Observable<IPropertyChangedEventArgs>;

        private setupRx(initialContents: Array<T>, resetChangeThreshold: number = 0.3 /* , scheduler: Rx.IScheduler = null */) {
            //scheduler = scheduler || wx.App.mainThreadScheduler;

            this.resetChangeThreshold = resetChangeThreshold;

            if (this.inner === undefined)
                this.inner = new Array<T>();

            this.changingSubject = new Rx.Subject<boolean>();
            this.changedSubject = new Rx.Subject<boolean>();

            this.beforeItemsAddedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());
            this.itemsAddedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());
            this.beforeItemsRemovedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());
            this.itemsRemovedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());
            this.beforeItemReplacedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());
            this.itemReplacedSubject = new Lazy<Rx.Subject<IAddReplaceRemoveInfo<T>>>(() => new Rx.Subject<IAddReplaceRemoveInfo<T>>());

            this.itemChangingSubject = new Lazy<Rx.ISubject<IPropertyChangedEventArgs>>(() =>
                <any> new Rx.Subject<IPropertyChangedEventArgs>());
                //<any> new ScheduledSubject<ReactiveIPropertyChangedEventArgs>(scheduler));

            this.itemChangedSubject = new Lazy<Rx.ISubject<IPropertyChangedEventArgs>>(() =>
                <any> new Rx.Subject<IPropertyChangedEventArgs>());
                //<any> new ScheduledSubject<ReactiveIPropertyChangedEventArgs>(scheduler));

            this.beforeItemsMovedSubject = new Lazy<Rx.Subject<IMoveInfo<T>>>(() => new Rx.Subject<IMoveInfo<T>>());
            this.itemsMovedSubject = new Lazy<Rx.Subject<IMoveInfo<T>>>(() => new Rx.Subject<IMoveInfo<T>>());

            if (initialContents) {
                Array.prototype.splice.apply(this.inner,(<T[]><any>[0, 0]).concat(initialContents));
            }
        }

        private areChangeNotificationsEnabled(): boolean {
            return this.changeNotificationsSuppressed === 0;
        }

        private insertItem(index: number, item: T): void {
            if (!this.areChangeNotificationsEnabled()) {
                this.inner.splice(index, 0, item);

                if (this.changeTrackingEnabled)
                    this.addItemToPropertyTracking(item);

                return;
            }

            this.changingSubject.onNext(false);

            if (this.beforeItemsAddedSubject.isValueCreated)
                this.beforeItemsAddedSubject.value.onNext({ items: [item], index: index });

            this.inner.splice(index, 0, item);

            this.changedSubject.onNext(false);

            if (this.itemsAddedSubject.isValueCreated)
                this.itemsAddedSubject.value.onNext({ items: [item], index: index });

            if (this.changeTrackingEnabled)
                this.addItemToPropertyTracking(item);
        }

        private removeItem(index: number): void {
            var item = this.inner[index];

            if (!this.areChangeNotificationsEnabled()) {
                this.inner.splice(index, 1);

                if (this.changeTrackingEnabled)
                    this.removeItemFromPropertyTracking(item);

                return;
            }

            this.changingSubject.onNext(false);

            if (this.beforeItemsRemovedSubject.isValueCreated)
                this.beforeItemsRemovedSubject.value.onNext({ items: [item], index: index });

            this.inner.splice(index, 1);

            this.changedSubject.onNext(false);

            if (this.itemsRemovedSubject.isValueCreated)
                this.itemsRemovedSubject.value.onNext({ items: [item], index: index });

            if (this.changeTrackingEnabled)
                this.removeItemFromPropertyTracking(item);
        }

        private moveItem(oldIndex: number, newIndex: number): void {
            var item = this.inner[oldIndex];

            if (!this.areChangeNotificationsEnabled()) {
                this.inner.splice(oldIndex, 1);
                this.inner.splice(newIndex, 0, item);

                return;
            }

             var mi = new MoveInfo<T>([item], oldIndex, newIndex);

             this.changingSubject.onNext(false);

            if (this.beforeItemsMovedSubject.isValueCreated)
                this.beforeItemsMovedSubject.value.onNext(mi);

            this.inner.splice(oldIndex, 1);
            this.inner.splice(newIndex, 0, item);

            this.changedSubject.onNext(false);

            if (this.itemsMovedSubject.isValueCreated)
                this.itemsMovedSubject.value.onNext(mi);
        }

        public set(index: number, item: T): void {
            if (!this.areChangeNotificationsEnabled()) {

                if (this.changeTrackingEnabled) {
                    this.removeItemFromPropertyTracking(this.inner[index]);
                    this.addItemToPropertyTracking(item);
                }

                this.inner[index] = item;
                return;
            }

            this.changingSubject.onNext(false);

            if (this.beforeItemReplacedSubject.isValueCreated)
                this.beforeItemReplacedSubject.value.onNext({ index: index, items: [item]});

            if (this.changeTrackingEnabled) {
                this.removeItemFromPropertyTracking(this.inner[index]);
                this.addItemToPropertyTracking(item);
            }

            this.inner[index] = item;
            this.changedSubject.onNext(false);

            if (this.itemReplacedSubject.isValueCreated)
                this.itemReplacedSubject.value.onNext({ index: index, items: [item] });
        }

        private clearItems(): void {
            if (!this.areChangeNotificationsEnabled()) {
                this.inner.length = 0;    // see http://stackoverflow.com/a/1232046/88513

                if (this.changeTrackingEnabled)
                    this.clearAllPropertyChangeWatchers();

                return;
            }

            this.changingSubject.onNext(true);
            this.inner.length = 0;    // see http://stackoverflow.com/a/1232046/88513
            this.changedSubject.onNext(true);

            if (this.changeTrackingEnabled)
                this.clearAllPropertyChangeWatchers();
        }

        private addItemToPropertyTracking(toTrack: T): void {
            var rcd = this.propertyChangeWatchers[utils.getOid(toTrack)];
            var self = this;

            if (rcd) {
                rcd.addRef();
                return;
            }

            var changing = observeObject(toTrack, true)
                .select(i => new internal.PropertyChangedEventArgs(toTrack, i.propertyName));

            var changed = observeObject(toTrack, false)
                .select(i => new internal.PropertyChangedEventArgs(toTrack, i.propertyName));

            var disp = new Rx.CompositeDisposable(
                changing.where(_ => self.areChangeNotificationsEnabled()).subscribe(x=> self.itemChangingSubject.value.onNext(x)),
                changed.where(_ => self.areChangeNotificationsEnabled()).subscribe(x=> self.itemChangedSubject.value.onNext(x)));

            this.propertyChangeWatchers[utils.getOid(toTrack)] = new RefCountDisposeWrapper(
                Rx.Disposable.create(() => {
                    disp.dispose();
                    delete self.propertyChangeWatchers[utils.getOid(toTrack)];
                }));
        }

        private removeItemFromPropertyTracking(toUntrack: T): void {
            var rcd = this.propertyChangeWatchers[utils.getOid(toUntrack)];

            if (rcd) {
                rcd.release();
            }
        }

        private clearAllPropertyChangeWatchers(): void {
            Object.keys(this.propertyChangeWatchers).forEach(x => {
                this.propertyChangeWatchers[x].release();
            });
        }

        private refcountSubscribers<TObs>(input: Rx.Observable<TObs>, block:(number)=> void): Rx.Observable<TObs> {
            return Rx.Observable.create<TObs>(subj => {
                block(1);

                return new Rx.CompositeDisposable(
                    input.subscribe(subj),
                    Rx.Disposable.create(() => block(-1)));
            });
        }

        private publishResetNotification() {
            this.changingSubject.onNext(true);
            this.changedSubject.onNext(true);
        }

        private isLengthAboveResetThreshold(toChangeLength: number): boolean {
            return toChangeLength / this.inner.length > this.resetChangeThreshold && toChangeLength > 10;
        }
    }

    class MoveInfo<T> implements IMoveInfo<T> {
        constructor(movedItems: Array<T>, from: number, to: number) {
            this.items = movedItems;
            this.from = from;
            this.to = to;
        }

        items: Array<T>;
        from: number;
        to: number;
    }

    export module internal {
        export var listConstructor = <any> ObservableList;
    }

    /**
    * Creates a new observable list with optional default contents
    * @param {Array<T>} initialContents The initial contents of the list
    * @param {number = 0.3} resetChangeThreshold
    */
    export function list<T>(initialContents?: Array<T>, resetChangeThreshold: number = 0.3 /*, scheduler: Rx.IScheduler = null */): IObservableList<T> {
        return new ObservableList<T>(initialContents, resetChangeThreshold);
    }
}