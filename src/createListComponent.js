// @flow

import memoizeOne from 'memoize-one';
import { createElement, PureComponent } from 'react';
import { isBrowserChrome } from './userAgent';

const isChrome = isBrowserChrome();
export type ScrollToAlign = 'auto' | 'center' | 'start' | 'end';

type itemSize = number | ((index: number) => number);
export type Direction = 'horizontal' | 'vertical';

export type RenderComponentProps<T> = {|
  data: T,
  index: number,
  style: Object,
|};
type RenderComponent<T> = React$ComponentType<$Shape<RenderComponentProps<T>>>;

type ScrollDirection = 'forward' | 'backward';

type onItemsRenderedCallback = ({
  overscanStartIndex: number,
  overscanStopIndex: number,
  visibleStartIndex: number,
  visibleStopIndex: number,
}) => void;
type onScrollCallback = ({
  scrollDirection: ScrollDirection,
  scrollOffset: number,
  scrollUpdateWasRequested: boolean,
}) => void;

type ScrollEvent = SyntheticEvent<HTMLDivElement>;
type ItemStyleCache = { [index: number]: Object };

export type Props<T> = {|
  children: RenderComponent<T>,
  className?: string,
  direction: Direction,
  height: number | string,
  initialScrollOffset?: number,
  innerRef?: any,
  innerTagName?: string,
  itemCount: number,
  itemData: T,
  itemKey?: (index: number, data: T) => any,
  itemSize: itemSize,
  onItemsRendered?: onItemsRenderedCallback,
  onScroll?: onScrollCallback,
  skipResizeClass?: string,
  outerRef?: any,
  outerTagName?: string,
  overscanCountForward: number,
  overscanCountBackward: number,
  style?: Object,
  width: number | string,
  innerListStyle?: object,
|};

type State = {|
  scrollDirection: ScrollDirection,
  scrollOffset: number,
  scrollUpdateWasRequested: boolean,
  scrolledToInitIndex: boolean,
|};

type GetItemOffset = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
type GetItemSize = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => ?number;
type GetEstimatedTotalSize = (props: Props<any>, instanceProps: any) => number;
type GetOffsetForIndexAndAlignment = (
  props: Props<any>,
  index: number,
  align: ScrollToAlign,
  scrollOffset: number,
  instanceProps: any
) => number;
type GetStartIndexForOffset = (
  props: Props<any>,
  offset: number,
  instanceProps: any
) => number;
type GetStopIndexForStartIndex = (
  props: Props<any>,
  startIndex: number,
  scrollOffset: number,
  instanceProps: any
) => number;
type InitInstanceProps = (props: Props<any>, instance: any) => any;
type ValidateProps = (props: Props<any>) => void;

export const defaultItemKey = (index: number, data: any) => {
  return index;
};

export default function createListComponent({
  getItemOffset,
  getEstimatedTotalSize,
  getItemSize,
  getOffsetForIndexAndAlignment,
  getStartIndexForOffset,
  getStopIndexForStartIndex,
  initInstanceProps,
  shouldResetStyleCacheOnItemSizeChange,
  validateProps,
}: {|
  getItemOffset: GetItemOffset,
  getEstimatedTotalSize: GetEstimatedTotalSize,
  getItemSize: GetItemSize,
  getOffsetForIndexAndAlignment: GetOffsetForIndexAndAlignment,
  getStartIndexForOffset: GetStartIndexForOffset,
  getStopIndexForStartIndex: GetStopIndexForStartIndex,
  initInstanceProps: InitInstanceProps,
  shouldResetStyleCacheOnItemSizeChange: boolean,
  validateProps: ValidateProps,
|}) {
  return class List<T> extends PureComponent<Props<T>, State> {
    _instanceProps: any = initInstanceProps(this.props, this);
    _outerRef: ?HTMLDivElement;
    _scrollCorrectionInProgress = false;
    _scrollByCorrection = null;
    _keepScrollPosition = false;
    _keepScrollToBottom = false;
    static defaultProps = {
      direction: 'vertical',
      innerTagName: 'div',
      itemData: undefined,
      outerTagName: 'div',
      overscanCountForward: 30,
      overscanCountBackward: 10,
    };

    state: State = {
      scrollDirection: 'backward',
      scrollOffset:
        typeof this.props.initialScrollOffset === 'number'
          ? this.props.initialScrollOffset
          : 0,
      scrollUpdateWasRequested: false,
      scrollDelta: 0,
      scrollHeight: 0,
      localOlderPostsToRender: [],
    };

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    constructor(props: Props<T>) {
      super(props);
    }

    static getDerivedStateFromProps(
      props: Props<T>,
      state: State
    ): $Shape<State> {
      validateSharedProps(props);
      validateProps(props);
      return null;
    }

    scrollBy = (scrollOffset, scrollBy) => () => {
      const element = ((this._outerRef: any): HTMLDivElement);
      if (typeof element.scrollBy === 'function' && scrollBy) {
        element.scrollBy(0, scrollBy);
      } else if (scrollOffset) {
        element.scrollTop = scrollOffset;
      }

      this._scrollCorrectionInProgress = false;
    };

    scrollTo(
      scrollOffset: number,
      scrollByValue: number,
      useAnimationFrame: boolean = false
    ): void {
      this._scrollCorrectionInProgress = true;
      this.setState(
        prevState => ({
          scrollDirection:
            prevState.scrollOffset >= scrollOffset ? 'backward' : 'forward',
          scrollOffset: scrollOffset,
          scrollUpdateWasRequested: true,
          scrollByValue,
        }),
        () => {
          if (isChrome && useAnimationFrame) {
            this._scrollByCorrection = window.requestAnimationFrame(
              this.scrollBy(this.state.scrollOffset, this.state.scrollByValue)
            );
          } else {
            this.scrollBy(this.state.scrollOffset, this.state.scrollByValue)();
          }
        }
      );

      this.forceUpdate();
    }

    scrollToItem(index: number, align: ScrollToAlign = 'auto'): void {
      const { scrollOffset } = this.state;

      //Ideally the below scrollTo works fine but firefox has 6px issue and stays 6px from bottom when corrected
      //so manually keeping scroll position bottom for now
      const element = ((this._outerRef: any): HTMLDivElement);
      if (index === 0 && align === 'end') {
        this.scrollTo(element.scrollHeight - this.props.height);
        return;
      }

      this.scrollTo(
        getOffsetForIndexAndAlignment(
          this.props,
          index,
          align,
          scrollOffset,
          this._instanceProps
        )
      );
    }

    componentDidMount() {
      const { initialScrollOffset, direction } = this.props;

      if (typeof initialScrollOffset === 'number' && this._outerRef !== null) {
        const element = ((this._outerRef: any): HTMLDivElement);
        if (direction === 'horizontal') {
          element.scrollLeft = initialScrollOffset;
        } else {
          element.scrollTop = initialScrollOffset;
        }
      }

      this._commitHook();
    }

    getSnapshotBeforeUpdate(prevProps, prevState) {
      if (
        prevState.localOlderPostsToRender[0] !==
          this.state.localOlderPostsToRender[0] ||
        prevState.localOlderPostsToRender[1] !==
          this.state.localOlderPostsToRender[1]
      ) {
        const element = this._outerRef;
        const previousScrollTop = element.scrollTop;
        const previousScrollHeight = element.scrollHeight;
        return {
          previousScrollTop,
          previousScrollHeight,
        };
      }
      return null;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
      if (this.state.scrolledToInitIndex) {
        const {
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested,
        } = this.state;

        const {
          scrollDirection: prevScrollDirection,
          scrollOffset: prevScrollOffset,
          scrollUpdateWasRequested: prevScrollUpdateWasRequested,
        } = prevState;

        if (
          scrollDirection !== prevScrollDirection ||
          scrollOffset !== prevScrollOffset ||
          scrollUpdateWasRequested !== prevScrollUpdateWasRequested
        ) {
          this._callPropsCallbacks();
        }
        if (!prevState.scrolledToInitIndex) {
          this._keepScrollPosition = false;
          this._keepScrollToBottom = false;
        }
      }

      this._commitHook();
      if (prevProps.itemData !== this.props.itemData) {
        this._dataChange();
      }

      if (prevProps.height !== this.props.height) {
        this._heightChange(prevProps.height, prevState.scrollOffset);
      }

      if (prevState.scrolledToInitIndex !== this.state.scrolledToInitIndex) {
        this._dataChange(); // though this is not data change we are checking for first load change
      }

      if (prevProps.width !== this.props.width) {
        this.innerRefWidth = this.props.innerRef.current.clientWidth;
        this._widthChange(prevProps.height, prevState.scrollOffset);
      }

      if (
        prevState.localOlderPostsToRender[0] !==
          this.state.localOlderPostsToRender[0] ||
        prevState.localOlderPostsToRender[1] !==
          this.state.localOlderPostsToRender[1]
      ) {
        const postlistScrollHeight = this._outerRef.scrollHeight;

        const scrollValue =
          snapshot.previousScrollTop +
          (postlistScrollHeight - snapshot.previousScrollHeight);

        this.scrollTo(
          scrollValue,
          scrollValue - snapshot.previousScrollTop,
          true
        );
      }
    }

    componentWillUnmount() {
      this._unmountHook();
      if (this._scrollByCorrection) {
        window.cancelAnimationFrame(this._scrollByCorrection);
      }
    }

    render() {
      const {
        className,
        direction,
        innerRef,
        innerTagName,
        outerTagName,
        style,
        innerListStyle,
      } = this.props;

      const onScroll =
        direction === 'vertical'
          ? this._onScrollVertical
          : this._onScrollHorizontal;

      const items = this._renderItems();

      return createElement(
        ((outerTagName: any): string),
        {
          className,
          onScroll,
          ref: this._outerRefSetter,
          style: {
            WebkitOverflowScrolling: 'touch',
            overflowY: 'auto',
            overflowAnchor: 'none',
            willChange: 'transform',
            width: '100%',
            ...style,
          },
        },
        createElement(((innerTagName: any): string), {
          children: items,
          ref: innerRef,
          style: innerListStyle,
        })
      );
    }

    _callOnItemsRendered: (
      overscanStartIndex: number,
      overscanStopIndex: number,
      visibleStartIndex: number,
      visibleStopIndex: number
    ) => void;
    _callOnItemsRendered = memoizeOne(
      (
        overscanStartIndex: number,
        overscanStopIndex: number,
        visibleStartIndex: number,
        visibleStopIndex: number
      ) =>
        ((this.props.onItemsRendered: any): onItemsRenderedCallback)({
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex,
        })
    );

    _callOnScroll: (
      scrollDirection: ScrollDirection,
      scrollOffset: number,
      scrollUpdateWasRequested: boolean,
      scrollHeight: number,
      clientHeight: number
    ) => void;
    _callOnScroll = memoizeOne(
      (
        scrollDirection: ScrollDirection,
        scrollOffset: number,
        scrollUpdateWasRequested: boolean,
        scrollHeight: number,
        clientHeight: number
      ) =>
        ((this.props.onScroll: any): onScrollCallback)({
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested,
          scrollHeight,
          clientHeight,
        })
    );

    _callPropsCallbacks() {
      const { itemCount, height } = this.props;
      const {
        scrollDirection,
        scrollOffset,
        scrollUpdateWasRequested,
        scrollHeight,
      } = this.state;

      if (typeof this.props.onItemsRendered === 'function') {
        if (itemCount > 0) {
          const [
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex,
          ] = this._getRangeToRender();

          this._callOnItemsRendered(
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex
          );

          if (
            scrollDirection === 'backward' &&
            scrollOffset < 1000 &&
            overscanStopIndex !== itemCount - 1
          ) {
            const sizeOfNextElement = getItemSize(
              this.props,
              overscanStopIndex + 1,
              this._instanceProps
            ).size;
            if (!sizeOfNextElement && this.state.scrolledToInitIndex) {
              this.setState(prevState => {
                if (
                  prevState.localOlderPostsToRender[0] !==
                  overscanStopIndex + 1
                ) {
                  return {
                    localOlderPostsToRender: [
                      overscanStopIndex + 1,
                      overscanStopIndex + 50,
                    ],
                  };
                }
                return null;
              });
            }
          }
        }
      }

      if (typeof this.props.onScroll === 'function') {
        this._callOnScroll(
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested,
          scrollHeight,
          height
        );
      }
    }

    // This method is called after mount and update.
    // List implementations can override this method to be notified.
    _commitHook() {}

    // This method is called before unmounting.
    // List implementations can override this method to be notified.
    _unmountHook() {}

    // This method is called when data changes
    // List implementations can override this method to be notified.
    _dataChange() {}

    // Lazily create and cache item styles while scrolling,
    // So that pure component sCU will prevent re-renders.
    // We maintain this cache, and pass a style prop rather than index,
    // So that List can clear cached styles and force item re-render if necessary.
    _getItemStyle: (index: number) => Object;
    _getItemStyle = (index: number): Object => {
      const { direction, itemSize, itemData } = this.props;

      const itemStyleCache = this._getItemStyleCache(
        shouldResetStyleCacheOnItemSizeChange && itemSize
      );

      let style;
      if (itemStyleCache.hasOwnProperty(itemData[index])) {
        style = itemStyleCache[itemData[index]];
      } else {
        itemStyleCache[itemData[index]] = style = {
          left:
            direction === 'horizontal'
              ? getItemOffset(this.props, index, this._instanceProps)
              : 0,
          top:
            direction === 'vertical'
              ? getItemOffset(this.props, index, this._instanceProps)
              : 0,
          height:
            direction === 'vertical'
              ? getItemSize(this.props, index, this._instanceProps)
              : '100%',
          width:
            direction === 'horizontal'
              ? getItemSize(this.props, index, this._instanceProps)
              : '100%',
        };
      }

      return style;
    };

    _itemStyleCache: ItemStyleCache;

    // TODO This memoized getter doesn't make much sense.
    // If all that's really needed is for the impl to be able to reset the cache,
    // Then we could expose a better API for that.
    _getItemStyleCache: (_: any) => ItemStyleCache;
    _getItemStyleCache = memoizeOne(_ => {
      this._itemStyleCache = {};

      return this._itemStyleCache;
    });

    _getRangeToRender(
      scrollTop,
      scrollHeight
    ): [number, number, number, number] {
      const {
        itemCount,
        overscanCountForward,
        overscanCountBackward,
      } = this.props;
      const { scrollDirection, scrollOffset } = this.state;

      if (itemCount === 0) {
        return [0, 0, 0, 0];
      }
      const scrollOffsetValue = scrollTop >= 0 ? scrollTop : scrollOffset;
      const startIndex = getStartIndexForOffset(
        this.props,
        scrollOffsetValue,
        this._instanceProps
      );
      const stopIndex = getStopIndexForStartIndex(
        this.props,
        startIndex,
        scrollOffsetValue,
        this._instanceProps
      );

      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward =
        scrollDirection === 'backward'
          ? overscanCountBackward
          : Math.max(1, overscanCountForward);

      const overscanForward =
        scrollDirection === 'forward'
          ? overscanCountBackward
          : Math.max(1, overscanCountForward);

      const minValue = Math.max(0, stopIndex - overscanBackward);
      let maxValue = Math.max(
        0,
        Math.min(itemCount - 1, startIndex + overscanForward)
      );

      while (
        !getItemSize(this.props, maxValue, this._instanceProps) &&
        maxValue > 0 &&
        this._instanceProps.totalMeasuredSize > this.props.height
      ) {
        maxValue--;
      }

      if (
        !this.state.scrolledToInitIndex &&
        this.props.initRangeToRender.length
      ) {
        return this.props.initRangeToRender;
      }

      return [minValue, maxValue, startIndex, stopIndex];
    }

    _renderItems() {
      const {
        children,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
      } = this.props;

      const [startIndex, stopIndex] = this._getRangeToRender();

      const items = [];
      if (itemCount > 0) {
        for (let index = startIndex; index <= stopIndex; index++) {
          items.push(
            createElement(children, {
              data: itemData,
              key: itemKey(index, itemData),
              index,
              style: this._getItemStyle(index),
            })
          );
        }
      }
      return items;
    }

    _onScrollHorizontal = (event: ScrollEvent): void => {
      const { scrollLeft } = event.currentTarget;
      this.setState(prevState => {
        if (prevState.scrollOffset === scrollLeft) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          return null;
        }

        return {
          scrollDirection:
            prevState.scrollOffset < scrollLeft ? 'forward' : 'backward',
          scrollOffset: scrollLeft,
          scrollUpdateWasRequested: false,
        };
      });
    };

    _onScrollVertical = (event: ScrollEvent): void => {
      if (!this.state.scrolledToInitIndex) {
        return;
      }
      const { scrollTop, scrollHeight } = event.currentTarget;
      if (this._scrollCorrectionInProgress) {
        if (this.state.scrollUpdateWasRequested) {
          this.setState(() => ({
            scrollUpdateWasRequested: false,
          }));
        }
        return;
      }

      if (scrollHeight !== this.state.scrollHeight) {
        this.setState({
          scrollHeight,
        });
      }

      this.setState(prevState => {
        if (prevState.scrollOffset === scrollTop) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          return null;
        }

        return {
          scrollDirection:
            prevState.scrollOffset < scrollTop ? 'forward' : 'backward',
          scrollOffset: scrollTop,
          scrollUpdateWasRequested: false,
          scrollHeight,
          scrollTop,
          scrollDelta: 0,
        };
      });
    };

    _outerRefSetter = (ref: any): void => {
      const { outerRef } = this.props;
      this.innerRefWidth = this.props.innerRef.current.clientWidth;
      this._outerRef = ((ref: any): HTMLDivElement);

      if (typeof outerRef === 'function') {
        outerRef(ref);
      } else if (
        outerRef != null &&
        typeof outerRef === 'object' &&
        outerRef.hasOwnProperty('current')
      ) {
        outerRef.current = ref;
      }
    };

    // Intentionally placed after all other instance properties have been initialized,
    // So that DynamicSizeList can override the render behavior.
    _instanceProps: any = initInstanceProps(this.props, this);
  };
}

// NOTE: I considered further wrapping individual items with a pure ListItem component.
// This would avoid ever calling the render function for the same index more than once,
// But it would also add the overhead of a lot of components/fibers.
// I assume people already do this (render function returning a class component),
// So my doing it would just unnecessarily double the wrappers.

const validateSharedProps = ({
  children,
  direction,
  height,
  width,
}: Props<any>): void => {
  if (process.env.NODE_ENV !== 'production') {
    if (direction !== 'horizontal' && direction !== 'vertical') {
      throw Error(
        'An invalid "direction" prop has been specified. ' +
          'Value should be either "horizontal" or "vertical". ' +
          `"${direction}" was specified.`
      );
    }

    if (children == null) {
      throw Error(
        'An invalid "children" prop has been specified. ' +
          'Value should be a React component. ' +
          `"${children === null ? 'null' : typeof children}" was specified.`
      );
    }

    if (direction === 'horizontal' && typeof width !== 'number') {
      throw Error(
        'An invalid "width" prop has been specified. ' +
          'Horizontal lists must specify a number for width. ' +
          `"${width === null ? 'null' : typeof width}" was specified.`
      );
    } else if (direction === 'vertical' && typeof height !== 'number') {
      throw Error(
        'An invalid "height" prop has been specified. ' +
          'Vertical lists must specify a number for height. ' +
          `"${height === null ? 'null' : typeof height}" was specified.`
      );
    }
  }
};
