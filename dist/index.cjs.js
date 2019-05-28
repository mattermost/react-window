'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var _inheritsLoose = _interopDefault(require('@babel/runtime/helpers/inheritsLoose'));
var _assertThisInitialized = _interopDefault(require('@babel/runtime/helpers/assertThisInitialized'));
var memoizeOne = _interopDefault(require('memoize-one'));
var React = require('react');
var React__default = _interopDefault(React);
var reactDom = require('react-dom');

// From https://stackoverflow.com/a/13348618/2902013
// please note,
// that IE11 now returns undefined again for window.chrome
// and new Opera 30 outputs true for window.chrome
// but needs to check if window.opr is not undefined
// and new IE Edge outputs to true now for window.chrome
// and if not iOS Chrome check
// so use the below updated condition
// we return true for electron as well as electron also does not immediately correct scroll
// similar to chrome and loads another set of posts.
// chromimum seems to work fine so mostly in near future chrome fixes the issue
function isBrowserChrome() {
  var isChromium = window.chrome;
  var winNav = window.navigator;
  var vendorName = winNav.vendor;
  var isOpera = typeof window.opr !== 'undefined';
  var isIEedge = winNav.userAgent.indexOf('Edge') > -1;
  var isIOSChrome = winNav.userAgent.match('CriOS');
  var isElectron = winNav.userAgent.toLowerCase().indexOf(' electron/') > -1;

  if (isIOSChrome || isElectron) {
    return true;
  } else if (isChromium !== null && typeof isChromium !== 'undefined' && vendorName === 'Google Inc.' && isOpera === false && isIEedge === false) {
    return true;
  }

  return false;
}

var isChrome =
/*#__PURE__*/
isBrowserChrome();
var defaultItemKey = function defaultItemKey(index, data) {
  return index;
};
function createListComponent(_ref) {
  var _class, _temp;

  var getItemOffset = _ref.getItemOffset,
      getEstimatedTotalSize = _ref.getEstimatedTotalSize,
      getItemSize = _ref.getItemSize,
      getOffsetForIndexAndAlignment = _ref.getOffsetForIndexAndAlignment,
      getStartIndexForOffset = _ref.getStartIndexForOffset,
      getStopIndexForStartIndex = _ref.getStopIndexForStartIndex,
      initInstanceProps = _ref.initInstanceProps,
      shouldResetStyleCacheOnItemSizeChange = _ref.shouldResetStyleCacheOnItemSizeChange,
      validateProps = _ref.validateProps;
  return _temp = _class =
  /*#__PURE__*/
  function (_PureComponent) {
    _inheritsLoose(List, _PureComponent);

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    function List(props) {
      var _this;

      _this = _PureComponent.call(this, props) || this;
      _this._instanceProps = initInstanceProps(_this.props, _assertThisInitialized(_assertThisInitialized(_this)));
      _this._outerRef = void 0;
      _this._scrollCorrectionInProgress = false;
      _this._scrollByCorrection = null;
      _this._keepScrollPosition = false;
      _this._keepScrollToBottom = false;
      _this.state = {
        scrollDirection: 'backward',
        scrollOffset: typeof _this.props.initialScrollOffset === 'number' ? _this.props.initialScrollOffset : 0,
        scrollUpdateWasRequested: false,
        scrollDelta: 0,
        scrollHeight: 0,
        localOlderPostsToRender: []
      };

      _this.scrollBy = function (scrollOffset, scrollBy) {
        return function () {
          var element = _this._outerRef;

          if (typeof element.scrollBy === 'function' && scrollBy) {
            element.scrollBy(0, scrollBy);
          } else if (scrollOffset) {
            element.scrollTop = scrollOffset;
          }

          _this._scrollCorrectionInProgress = false;
        };
      };

      _this._callOnItemsRendered = void 0;
      _this._callOnItemsRendered = memoizeOne(function (overscanStartIndex, overscanStopIndex, visibleStartIndex, visibleStopIndex) {
        return _this.props.onItemsRendered({
          overscanStartIndex: overscanStartIndex,
          overscanStopIndex: overscanStopIndex,
          visibleStartIndex: visibleStartIndex,
          visibleStopIndex: visibleStopIndex
        });
      });
      _this._callOnScroll = void 0;
      _this._callOnScroll = memoizeOne(function (scrollDirection, scrollOffset, scrollUpdateWasRequested, scrollHeight, clientHeight) {
        return _this.props.onScroll({
          scrollDirection: scrollDirection,
          scrollOffset: scrollOffset,
          scrollUpdateWasRequested: scrollUpdateWasRequested,
          scrollHeight: scrollHeight,
          clientHeight: clientHeight
        });
      });
      _this._getItemStyle = void 0;

      _this._getItemStyle = function (index) {
        var _this$props = _this.props,
            direction = _this$props.direction,
            itemSize = _this$props.itemSize,
            itemData = _this$props.itemData;

        var itemStyleCache = _this._getItemStyleCache(shouldResetStyleCacheOnItemSizeChange && itemSize);

        var style;

        if (itemStyleCache.hasOwnProperty(itemData[index])) {
          style = itemStyleCache[itemData[index]];
        } else {
          itemStyleCache[itemData[index]] = style = {
            left: direction === 'horizontal' ? getItemOffset(_this.props, index, _this._instanceProps) : 0,
            top: direction === 'vertical' ? getItemOffset(_this.props, index, _this._instanceProps) : 0,
            height: direction === 'vertical' ? getItemSize(_this.props, index, _this._instanceProps) : '100%',
            width: direction === 'horizontal' ? getItemSize(_this.props, index, _this._instanceProps) : '100%'
          };
        }

        return style;
      };

      _this._itemStyleCache = void 0;
      _this._getItemStyleCache = void 0;
      _this._getItemStyleCache = memoizeOne(function (_) {
        _this._itemStyleCache = {};
        return _this._itemStyleCache;
      });

      _this._onScrollHorizontal = function (event) {
        var scrollLeft = event.currentTarget.scrollLeft;

        _this.setState(function (prevState) {
          if (prevState.scrollOffset === scrollLeft) {
            // Scroll position may have been updated by cDM/cDU,
            // In which case we don't need to trigger another render,
            return null;
          }

          return {
            scrollDirection: prevState.scrollOffset < scrollLeft ? 'forward' : 'backward',
            scrollOffset: scrollLeft,
            scrollUpdateWasRequested: false
          };
        });
      };

      _this._onScrollVertical = function (event) {
        if (!_this.state.scrolledToInitIndex) {
          return;
        }

        var _event$currentTarget = event.currentTarget,
            scrollTop = _event$currentTarget.scrollTop,
            scrollHeight = _event$currentTarget.scrollHeight;

        if (_this._scrollCorrectionInProgress) {
          if (_this.state.scrollUpdateWasRequested) {
            _this.setState(function () {
              return {
                scrollUpdateWasRequested: false
              };
            });
          }

          return;
        }

        if (_this.state.scrollHeight !== 0 && scrollHeight !== _this.state.scrollHeight) {
          _this.setState({
            scrollHeight: scrollHeight
          });
        }

        _this.setState(function (prevState) {
          if (prevState.scrollOffset === scrollTop) {
            // Scroll position may have been updated by cDM/cDU,
            // In which case we don't need to trigger another render,
            return null;
          }

          return {
            scrollDirection: prevState.scrollOffset < scrollTop ? 'forward' : 'backward',
            scrollOffset: scrollTop,
            scrollUpdateWasRequested: false,
            scrollHeight: scrollHeight,
            scrollTop: scrollTop,
            scrollDelta: 0
          };
        });
      };

      _this._outerRefSetter = function (ref) {
        var outerRef = _this.props.outerRef;
        _this.innerRefWidth = _this.props.innerRef.current.clientWidth;
        _this._outerRef = ref;

        if (typeof outerRef === 'function') {
          outerRef(ref);
        } else if (outerRef != null && typeof outerRef === 'object' && outerRef.hasOwnProperty('current')) {
          outerRef.current = ref;
        }
      };

      _this._instanceProps = initInstanceProps(_this.props, _assertThisInitialized(_assertThisInitialized(_this)));
      return _this;
    }

    List.getDerivedStateFromProps = function getDerivedStateFromProps(props, state) {
      validateSharedProps(props);
      validateProps(props);
      return null;
    };

    var _proto = List.prototype;

    _proto.scrollTo = function scrollTo(scrollOffset, scrollByValue, useAnimationFrame) {
      var _this2 = this;

      if (useAnimationFrame === void 0) {
        useAnimationFrame = false;
      }

      this._scrollCorrectionInProgress = true;
      this.setState(function (prevState) {
        return {
          scrollDirection: prevState.scrollOffset >= scrollOffset ? 'backward' : 'forward',
          scrollOffset: scrollOffset,
          scrollUpdateWasRequested: true,
          scrollByValue: scrollByValue
        };
      }, function () {
        if (isChrome && useAnimationFrame) {
          if (_this2._scrollByCorrection) {
            window.cancelAnimationFrame(_this2._scrollByCorrection);
          }

          _this2._scrollByCorrection = window.requestAnimationFrame(_this2.scrollBy(_this2.state.scrollOffset, _this2.state.scrollByValue));
        } else {
          _this2.scrollBy(_this2.state.scrollOffset, _this2.state.scrollByValue)();
        }
      });
    };

    _proto.scrollToItem = function scrollToItem(index, align) {
      if (align === void 0) {
        align = 'auto';
      }

      var scrollOffset = this.state.scrollOffset; //Ideally the below scrollTo works fine but firefox has 6px issue and stays 6px from bottom when corrected
      //so manually keeping scroll position bottom for now

      var element = this._outerRef;

      if (index === 0 && align === 'end') {
        this.scrollTo(element.scrollHeight - this.props.height);
        return;
      }

      this.scrollTo(getOffsetForIndexAndAlignment(this.props, index, align, scrollOffset, this._instanceProps));
    };

    _proto.componentDidMount = function componentDidMount() {
      var _this$props2 = this.props,
          initialScrollOffset = _this$props2.initialScrollOffset,
          direction = _this$props2.direction;

      if (typeof initialScrollOffset === 'number' && this._outerRef !== null) {
        var element = this._outerRef;

        if (direction === 'horizontal') {
          element.scrollLeft = initialScrollOffset;
        } else {
          element.scrollTop = initialScrollOffset;
        }
      }

      this._commitHook();
    };

    _proto.getSnapshotBeforeUpdate = function getSnapshotBeforeUpdate(prevProps, prevState) {
      if (prevState.localOlderPostsToRender[0] !== this.state.localOlderPostsToRender[0] || prevState.localOlderPostsToRender[1] !== this.state.localOlderPostsToRender[1]) {
        var element = this._outerRef;
        var previousScrollTop = element.scrollTop;
        var previousScrollHeight = element.scrollHeight;
        return {
          previousScrollTop: previousScrollTop,
          previousScrollHeight: previousScrollHeight
        };
      }

      return null;
    };

    _proto.componentDidUpdate = function componentDidUpdate(prevProps, prevState, snapshot) {
      if (this.state.scrolledToInitIndex) {
        var _this$state = this.state,
            _scrollDirection = _this$state.scrollDirection,
            _scrollOffset = _this$state.scrollOffset,
            _scrollUpdateWasRequested = _this$state.scrollUpdateWasRequested;
        var prevScrollDirection = prevState.scrollDirection,
            prevScrollOffset = prevState.scrollOffset,
            prevScrollUpdateWasRequested = prevState.scrollUpdateWasRequested;

        if (_scrollDirection !== prevScrollDirection || _scrollOffset !== prevScrollOffset || _scrollUpdateWasRequested !== prevScrollUpdateWasRequested) {
          this._callPropsCallbacks();
        }

        if (!prevState.scrolledToInitIndex) {
          this._keepScrollPosition = false;
          this._keepScrollToBottom = false;
        }
      }

      this._commitHook();

      if (prevProps.itemData.length !== this.props.itemData.length) {
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

      if (prevState.localOlderPostsToRender[0] !== this.state.localOlderPostsToRender[0] || prevState.localOlderPostsToRender[1] !== this.state.localOlderPostsToRender[1]) {
        var postlistScrollHeight = this._outerRef.scrollHeight;
        var scrollValue = snapshot.previousScrollTop + (postlistScrollHeight - snapshot.previousScrollHeight);
        this.scrollTo(scrollValue, scrollValue - snapshot.previousScrollTop, true);
      }
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      this._unmountHook();
    };

    _proto.render = function render() {
      var _this$props3 = this.props,
          className = _this$props3.className,
          direction = _this$props3.direction,
          innerRef = _this$props3.innerRef,
          innerTagName = _this$props3.innerTagName,
          outerTagName = _this$props3.outerTagName,
          style = _this$props3.style,
          innerListStyle = _this$props3.innerListStyle;
      var onScroll = direction === 'vertical' ? this._onScrollVertical : this._onScrollHorizontal;

      var items = this._renderItems();

      return React.createElement(outerTagName, {
        className: className,
        onScroll: onScroll,
        ref: this._outerRefSetter,
        style: _extends({
          WebkitOverflowScrolling: 'touch',
          overflowY: 'auto',
          overflowAnchor: 'none',
          willChange: 'transform',
          width: '100%'
        }, style)
      }, React.createElement(innerTagName, {
        children: items,
        ref: innerRef,
        style: innerListStyle
      }));
    };

    _proto._callPropsCallbacks = function _callPropsCallbacks() {
      var _this$props4 = this.props,
          itemCount = _this$props4.itemCount,
          height = _this$props4.height;
      var _this$state2 = this.state,
          scrollDirection = _this$state2.scrollDirection,
          scrollOffset = _this$state2.scrollOffset,
          scrollUpdateWasRequested = _this$state2.scrollUpdateWasRequested,
          scrollHeight = _this$state2.scrollHeight;

      if (typeof this.props.onItemsRendered === 'function') {
        if (itemCount > 0) {
          var _this$_getRangeToRend = this._getRangeToRender(),
              _overscanStartIndex = _this$_getRangeToRend[0],
              _overscanStopIndex = _this$_getRangeToRend[1],
              _visibleStartIndex = _this$_getRangeToRend[2],
              _visibleStopIndex = _this$_getRangeToRend[3];

          this._callOnItemsRendered(_overscanStartIndex, _overscanStopIndex, _visibleStartIndex, _visibleStopIndex);

          if (scrollDirection === 'backward' && scrollOffset < 1000 && _overscanStopIndex !== itemCount - 1) {
            var sizeOfNextElement = getItemSize(this.props, _overscanStopIndex + 1, this._instanceProps).size;

            if (!sizeOfNextElement && this.state.scrolledToInitIndex) {
              this.setState(function (prevState) {
                if (prevState.localOlderPostsToRender[0] !== _overscanStopIndex + 1) {
                  return {
                    localOlderPostsToRender: [_overscanStopIndex + 1, _overscanStopIndex + 50]
                  };
                }

                return null;
              });
            }
          }
        }
      }

      if (typeof this.props.onScroll === 'function') {
        this._callOnScroll(scrollDirection, scrollOffset, scrollUpdateWasRequested, scrollHeight, height);
      }
    } // This method is called after mount and update.
    // List implementations can override this method to be notified.
    ;

    _proto._commitHook = function _commitHook() {} // This method is called before unmounting.
    // List implementations can override this method to be notified.
    ;

    _proto._unmountHook = function _unmountHook() {} // This method is called when data changes
    // List implementations can override this method to be notified.
    ;

    _proto._dataChange = function _dataChange() {} // Lazily create and cache item styles while scrolling,
    // So that pure component sCU will prevent re-renders.
    // We maintain this cache, and pass a style prop rather than index,
    // So that List can clear cached styles and force item re-render if necessary.
    ;

    _proto._getRangeToRender = function _getRangeToRender(scrollTop, scrollHeight) {
      var _this$props5 = this.props,
          itemCount = _this$props5.itemCount,
          overscanCountForward = _this$props5.overscanCountForward,
          overscanCountBackward = _this$props5.overscanCountBackward;
      var _this$state3 = this.state,
          scrollDirection = _this$state3.scrollDirection,
          scrollOffset = _this$state3.scrollOffset;

      if (itemCount === 0) {
        return [0, 0, 0, 0];
      }

      var scrollOffsetValue = scrollTop >= 0 ? scrollTop : scrollOffset;
      var startIndex = getStartIndexForOffset(this.props, scrollOffsetValue, this._instanceProps);
      var stopIndex = getStopIndexForStartIndex(this.props, startIndex, scrollOffsetValue, this._instanceProps); // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.

      var overscanBackward = scrollDirection === 'backward' ? overscanCountBackward : Math.max(1, overscanCountForward);
      var overscanForward = scrollDirection === 'forward' ? overscanCountBackward : Math.max(1, overscanCountForward);
      var minValue = Math.max(0, stopIndex - overscanBackward);
      var maxValue = Math.max(0, Math.min(itemCount - 1, startIndex + overscanForward));

      while (!getItemSize(this.props, maxValue, this._instanceProps) && maxValue > 0) {
        maxValue--;
      }

      if (!this.state.scrolledToInitIndex && this.props.initRangeToRender.length) {
        return this.props.initRangeToRender;
      }

      return [minValue, maxValue, startIndex, stopIndex];
    };

    _proto._renderItems = function _renderItems() {
      var _this$props6 = this.props,
          children = _this$props6.children,
          itemCount = _this$props6.itemCount,
          itemData = _this$props6.itemData,
          _this$props6$itemKey = _this$props6.itemKey,
          itemKey = _this$props6$itemKey === void 0 ? defaultItemKey : _this$props6$itemKey;

      var _this$_getRangeToRend2 = this._getRangeToRender(),
          startIndex = _this$_getRangeToRend2[0],
          stopIndex = _this$_getRangeToRend2[1];

      var items = [];

      if (itemCount > 0) {
        for (var _index = startIndex; _index <= stopIndex; _index++) {
          items.push(React.createElement(children, {
            data: itemData,
            key: itemKey(_index, itemData),
            index: _index,
            style: this._getItemStyle(_index)
          }));
        }
      }

      return items;
    };

    return List;
  }(React.PureComponent), _class.defaultProps = {
    direction: 'vertical',
    innerTagName: 'div',
    itemData: undefined,
    outerTagName: 'div',
    overscanCountForward: 30,
    overscanCountBackward: 10
  }, _temp;
} // NOTE: I considered further wrapping individual items with a pure ListItem component.
// This would avoid ever calling the render function for the same index more than once,
// But it would also add the overhead of a lot of components/fibers.
// I assume people already do this (render function returning a class component),
// So my doing it would just unnecessarily double the wrappers.

var validateSharedProps = function validateSharedProps(_ref2) {
  var children = _ref2.children,
      direction = _ref2.direction,
      height = _ref2.height,
      width = _ref2.width;

  if (process.env.NODE_ENV !== 'production') {
    if (direction !== 'horizontal' && direction !== 'vertical') {
      throw Error('An invalid "direction" prop has been specified. ' + 'Value should be either "horizontal" or "vertical". ' + ("\"" + direction + "\" was specified."));
    }

    if (children == null) {
      throw Error('An invalid "children" prop has been specified. ' + 'Value should be a React component. ' + ("\"" + (children === null ? 'null' : typeof children) + "\" was specified."));
    }

    if (direction === 'horizontal' && typeof width !== 'number') {
      throw Error('An invalid "width" prop has been specified. ' + 'Horizontal lists must specify a number for width. ' + ("\"" + (width === null ? 'null' : typeof width) + "\" was specified."));
    } else if (direction === 'vertical' && typeof height !== 'number') {
      throw Error('An invalid "height" prop has been specified. ' + 'Vertical lists must specify a number for height. ' + ("\"" + (height === null ? 'null' : typeof height) + "\" was specified."));
    }
  }
};

var scrollBarWidth = 8;
var scrollableContainerStyles = {
  display: 'inline',
  width: '0px',
  height: '0px',
  zIndex: '-1',
  overflow: 'hidden',
  margin: '0px',
  padding: '0px'
};
var scrollableWrapperStyle = {
  position: 'absolute',
  flex: '0 0 auto',
  overflow: 'hidden',
  visibility: 'hidden',
  zIndex: '-1',
  width: '100%',
  height: '100%',
  left: '0px',
  top: '0px'
};
var expandShrinkContainerStyles = {
  flex: '0 0 auto',
  overflow: 'hidden',
  zIndex: '-1',
  visibility: 'hidden',
  left: "-" + (scrollBarWidth + 1) + "px",
  //8px(scrollbar width) + 1px
  bottom: "-" + scrollBarWidth + "px",
  //8px because of scrollbar width
  right: "-" + scrollBarWidth + "px",
  //8px because of scrollbar width
  top: "-" + (scrollBarWidth + 1) + "px" //8px(scrollbar width) + 1px

};
var expandShrinkStyles = {
  position: 'absolute',
  flex: '0 0 auto',
  visibility: 'hidden',
  overflow: 'scroll',
  zIndex: '-1',
  width: '100%',
  height: '100%'
};
var shrinkChildStyle = {
  position: 'absolute',
  height: '200%',
  width: '200%'
}; //values below need to be changed when scrollbar width changes
//TODO: change these to be dynamic

var shrinkScrollDelta = 2 * scrollBarWidth + 1; // 17 = 2* scrollbar width(8px) + 1px as buffer
// 27 = 2* scrollbar width(8px) + 1px as buffer + 10px(this value is based of off lib(Link below). Probably not needed but doesnt hurt to leave)
//https://github.com/wnr/element-resize-detector/blob/27983e59dce9d8f1296d8f555dc2340840fb0804/src/detection-strategy/scroll.js#L246

var expandScrollDelta = shrinkScrollDelta + 10;

var ItemMeasurer =
/*#__PURE__*/
function (_Component) {
  _inheritsLoose(ItemMeasurer, _Component);

  function ItemMeasurer() {
    var _this;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _Component.call.apply(_Component, [this].concat(args)) || this;
    _this._node = null;
    _this._resizeObserver = null;
    _this._resizeSensorExpand = React__default.createRef();
    _this._resizeSensorShrink = React__default.createRef();
    _this._positionScrollbarsRef = null;

    _this.positionScrollBars = function (height, width) {
      if (height === void 0) {
        height = _this.props.size;
      }

      if (width === void 0) {
        width = _this.props.width;
      }

      //we are position these hiiden div scroll bars to the end so they can emit
      //scroll event when height in the div changes
      //Heavily inspired from https://github.com/marcj/css-element-queries/blob/master/src/ResizeSensor.js
      //and https://github.com/wnr/element-resize-detector/blob/master/src/detection-strategy/scroll.js
      //For more info http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/#comment-244
      if (_this._positionScrollbarsRef) {
        window.cancelAnimationFrame(_this._positionScrollbarsRef);
      }

      _this._positionScrollbarsRef = window.requestAnimationFrame(function () {
        _this._resizeSensorExpand.current.scrollTop = height + expandScrollDelta;
        _this._resizeSensorShrink.current.scrollTop = 2 * height + shrinkScrollDelta;
      });
    };

    _this.scrollingDiv = function (event) {
      if (event.target.offsetHeight !== _this.props.size) {
        _this._measureItem(event.target.offsetWidth !== _this.props.width);
      }
    };

    _this.renderItems = function () {
      var item = _this.props.item;
      var expandChildStyle = {
        position: 'absolute',
        left: '0',
        top: '0',
        height: _this.props.size + expandScrollDelta + "px",
        width: '100%'
      };
      var renderItem = React__default.createElement("div", {
        style: {
          position: 'relative'
        }
      }, item, React__default.createElement("div", {
        style: scrollableContainerStyles
      }, React__default.createElement("div", {
        dir: "ltr",
        style: scrollableWrapperStyle
      }, React__default.createElement("div", {
        style: expandShrinkContainerStyles
      }, React__default.createElement("div", {
        style: expandShrinkStyles,
        ref: _this._resizeSensorExpand,
        onScroll: _this.scrollingDiv
      }, React__default.createElement("div", {
        style: expandChildStyle
      })), React__default.createElement("div", {
        style: expandShrinkStyles,
        ref: _this._resizeSensorShrink,
        onScroll: _this.scrollingDiv
      }, React__default.createElement("div", {
        style: shrinkChildStyle
      }))))));
      return renderItem;
    };

    _this._measureItem = function (forceScrollCorrection) {
      var _this$props = _this.props,
          direction = _this$props.direction,
          handleNewMeasurements = _this$props.handleNewMeasurements,
          oldSize = _this$props.size,
          itemId = _this$props.itemId;
      var node = _this._node;

      if (node && node.ownerDocument && node.ownerDocument.defaultView && node instanceof node.ownerDocument.defaultView.HTMLElement) {
        var newSize = direction === 'horizontal' ? Math.ceil(node.offsetWidth) : Math.ceil(node.offsetHeight);

        if (oldSize !== newSize) {
          handleNewMeasurements(itemId, newSize, forceScrollCorrection);
        }
      }
    };

    return _this;
  }

  var _proto = ItemMeasurer.prototype;

  _proto.componentDidMount = function componentDidMount() {
    var node = reactDom.findDOMNode(this);
    this._node = node; // Force sync measure for the initial mount.
    // This is necessary to support the DynamicSizeList layout logic.

    this._measureItem(false);

    if (this.props.size) {
      // Don't wait for positioning scrollbars when we have size
      // This is needed triggering an event for remounting a post
      this.positionScrollBars();
    }
  };

  _proto.shouldComponentUpdate = function shouldComponentUpdate(nextProps) {
    if (nextProps.width !== this.props.width || nextProps.size !== this.props.size || nextProps.itemCount !== this.props.itemCount) {
      return true;
    }

    return false;
  };

  _proto.componentDidUpdate = function componentDidUpdate(prevProps) {
    if (prevProps.size === 0 && this.props.size !== 0 || prevProps.size !== this.props.size) {
      this.positionScrollBars();
    }
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    if (this._positionScrollbarsRef) {
      window.cancelAnimationFrame(this._positionScrollbarsRef);
    }

    var _this$props2 = this.props,
        onUnmount = _this$props2.onUnmount,
        itemId = _this$props2.itemId,
        index = _this$props2.index;

    if (onUnmount) {
      onUnmount(itemId, index);
    }
  };

  _proto.render = function render() {
    return this.renderItems();
  };

  return ItemMeasurer;
}(React.Component);

var DEFAULT_ESTIMATED_ITEM_SIZE = 50;

var getItemMetadata = function getItemMetadata(props, index, instanceProps) {
  var instance = instanceProps.instance,
      itemOffsetMap = instanceProps.itemOffsetMap,
      itemSizeMap = instanceProps.itemSizeMap;
  var itemData = instance.props.itemData; // If the specified item has not yet been measured,
  // Just return an estimated size for now.

  if (!itemSizeMap[itemData[index]]) {
    return {
      offset: 0,
      size: 0
    };
  }

  var offset = itemOffsetMap[itemData[index]] || 0;
  var size = itemSizeMap[itemData[index]] || 0;
  return {
    offset: offset,
    size: size
  };
};

var generateOffsetMeasurements = function generateOffsetMeasurements(props, index, instanceProps) {
  var instance = instanceProps.instance,
      itemOffsetMap = instanceProps.itemOffsetMap,
      itemSizeMap = instanceProps.itemSizeMap;
  var _instance$props = instance.props,
      itemData = _instance$props.itemData,
      itemCount = _instance$props.itemCount;
  instanceProps.totalMeasuredSize = 0;

  for (var i = itemCount - 1; i >= 0; i--) {
    var prevOffset = itemOffsetMap[itemData[i + 1]] || 0; // In some browsers (e.g. Firefox) fast scrolling may skip rows.
    // In this case, our assumptions about last measured indices may be incorrect.
    // Handle this edge case to prevent NaN values from breaking styles.
    // Slow scrolling back over these skipped rows will adjust their sizes.

    var prevSize = itemSizeMap[itemData[i + 1]] || 0;
    itemOffsetMap[itemData[i]] = prevOffset + prevSize;
    instanceProps.totalMeasuredSize += itemSizeMap[itemData[i]] || 0; // Reset cached style to clear stale position.

    delete instance._itemStyleCache[itemData[i]];
  }
};

var findNearestItemBinarySearch = function findNearestItemBinarySearch(props, instanceProps, high, low, offset) {
  while (low < high) {
    var offsetNew = offset;
    var middle = low + Math.floor((high - low) / 2);
    var currentOffset = getItemMetadata(props, middle, instanceProps).offset;

    if (currentOffset === offsetNew) {
      return middle;
    } else if (currentOffset > offsetNew) {
      low = middle + 1;
    } else if (currentOffset < offsetNew) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

var getEstimatedTotalSize = function getEstimatedTotalSize(_ref, _ref2) {
  var itemCount = _ref.itemCount;
  var itemSizeMap = _ref2.itemSizeMap,
      estimatedItemSize = _ref2.estimatedItemSize,
      totalMeasuredSize = _ref2.totalMeasuredSize;
  return totalMeasuredSize;
};

var DynamicSizeList =
/*#__PURE__*/
createListComponent({
  getItemOffset: function getItemOffset(props, index, instanceProps) {
    return getItemMetadata(props, index, instanceProps).offset;
  },
  getItemSize: function getItemSize(props, index, instanceProps) {
    // Do not hard-code item dimensions.
    // We don't know them initially.
    // Even once we do, changes in item content or list size should reflow.
    return getItemMetadata(props, index, instanceProps).size;
  },
  getEstimatedTotalSize: getEstimatedTotalSize,
  getOffsetForIndexAndAlignment: function getOffsetForIndexAndAlignment(props, index, align, scrollOffset, instanceProps) {
    var direction = props.direction,
        height = props.height,
        width = props.width;
    var itemMetadata = getItemMetadata(props, index, instanceProps); // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.

    var estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);
    var maxOffset = Math.max(0, itemMetadata.offset + itemMetadata.size - height);
    var minOffset = Math.max(0, itemMetadata.offset);

    switch (align) {
      case 'start':
        return minOffset;

      case 'end':
        return maxOffset;

      case 'center':
        return Math.round(minOffset - height / 2 + itemMetadata.size / 2);

      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return estimatedTotalSize - (scrollOffset + height);
        } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }

    }
  },
  getStartIndexForOffset: function getStartIndexForOffset(props, offset, instanceProps) {
    var totalMeasuredSize = instanceProps.totalMeasuredSize;
    var itemCount = props.itemCount; // If we've already positioned and measured past this point,
    // Use a binary search to find the closets cell.

    if (offset <= totalMeasuredSize) {
      return findNearestItemBinarySearch(props, instanceProps, itemCount, 0, offset);
    } // Otherwise render a new batch of items starting from where 0.


    return 0;
  },
  getStopIndexForStartIndex: function getStopIndexForStartIndex(props, startIndex, scrollOffset, instanceProps) {
    var itemCount = props.itemCount;
    var stopIndex = startIndex;
    var maxOffset = scrollOffset + props.height;
    var itemMetadata = getItemMetadata(props, stopIndex, instanceProps);
    var offset = itemMetadata.offset + (itemMetadata.size || 0);
    var closestOffsetIndex = 0;

    while (stopIndex > 0 && offset <= maxOffset) {
      var _itemMetadata = getItemMetadata(props, stopIndex, instanceProps);

      offset = _itemMetadata.offset + _itemMetadata.size;
      stopIndex--;
    }

    if (stopIndex >= itemCount) {
      return closestOffsetIndex;
    }

    return stopIndex;
  },
  initInstanceProps: function initInstanceProps(props, instance) {
    var _ref3 = props,
        estimatedItemSize = _ref3.estimatedItemSize;
    var instanceProps = {
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE,
      instance: instance,
      itemOffsetMap: {},
      itemSizeMap: {},
      totalMeasuredSize: 0,
      atBottom: true
    };
    var mountingCorrections = 0;
    var correctedInstances = 0;

    var handleNewMeasurements = function handleNewMeasurements(key, newSize, forceScrollCorrection) {
      var itemSizeMap = instanceProps.itemSizeMap;
      var itemData = instance.props.itemData;
      var index = itemData.findIndex(function (item) {
        return item === key;
      }); // In some browsers (e.g. Firefox) fast scrolling may skip rows.
      // In this case, our assumptions about last measured indices may be incorrect.
      // Handle this edge case to prevent NaN values from breaking styles.
      // Slow scrolling back over these skipped rows will adjust their sizes.

      var oldSize = itemSizeMap[key] || 0;

      if (oldSize === newSize) {
        return;
      }

      itemSizeMap[key] = newSize;

      if (!instance.state.scrolledToInitIndex) {
        generateOffsetMeasurements(props, index, instanceProps);
        return;
      }

      var element = instance._outerRef;

      if (instance.props.height + element.scrollTop >= instanceProps.totalMeasuredSize - 10 || instance._keepScrollToBottom) {
        generateOffsetMeasurements(props, index, instanceProps);
        instance.scrollToItem(0, 'end');
        instance.forceUpdate();
        return;
      }

      if (forceScrollCorrection || instance._keepScrollPosition) {
        var delta = newSize - oldSize;

        var _instance$_getRangeTo = instance._getRangeToRender(instance.state.scrollOffset),
            visibleStartIndex = _instance$_getRangeTo[2];

        generateOffsetMeasurements(props, index, instanceProps);

        if (index < visibleStartIndex + 1) {
          return;
        }

        instance._scrollCorrectionInProgress = true;
        instance.setState(function (prevState) {
          var deltaValue;

          if (mountingCorrections === 0) {
            deltaValue = delta;
          } else {
            deltaValue = prevState.scrollDelta + delta;
          }

          mountingCorrections++;
          var newOffset = prevState.scrollOffset + delta;
          return {
            scrollOffset: newOffset,
            scrollDelta: deltaValue
          };
        }, function () {
          // $FlowFixMe Property scrollBy is missing in HTMLDivElement
          correctedInstances++;

          if (mountingCorrections === correctedInstances) {
            correctScroll();
          }
        });
        return;
      }

      generateOffsetMeasurements(props, index, instanceProps);
    };

    var correctScroll = function correctScroll() {
      var scrollOffset = instance.state.scrollOffset;
      var element = instance._outerRef;

      if (element) {
        element.scrollTop = scrollOffset;
        instance._scrollCorrectionInProgress = false;
        correctedInstances = 0;
        mountingCorrections = 0;
      }
    };

    var onItemRowUnmount = function onItemRowUnmount(itemId, index) {
      var props = instance.props;

      if (props.itemData[index] === itemId) {
        return;
      }

      var doesItemExist = props.itemData.includes(itemId);

      if (!doesItemExist) {
        delete instanceProps.itemSizeMap[itemId];
        delete instanceProps.itemOffsetMap[itemId];
        var element = instance._outerRef;
        var atBottom = element.offsetHeight + element.scrollTop >= instanceProps.totalMeasuredSize - 10;
        generateOffsetMeasurements(props, index, instanceProps);

        if (atBottom) {
          instance.scrollToItem(0, 'end');
        }

        instance.forceUpdate();
      }
    };

    instance._dataChange = function () {
      if (instanceProps.totalMeasuredSize < instance.props.height) {
        instance.props.canLoadMorePosts();
      }
    };

    instance._heightChange = function (prevHeight, prevOffset) {
      if (prevOffset + prevHeight >= instanceProps.totalMeasuredSize - 10) {
        instance.scrollToItem(0, 'end');
        return;
      }
    };

    instance._widthChange = function (prevHeight, prevOffset) {
      if (prevOffset + prevHeight >= instanceProps.totalMeasuredSize - 10) {
        instance.scrollToItem(0, 'end');
        return;
      }
    };

    instance._commitHook = function () {
      if (!instance.state.scrolledToInitIndex && Object.keys(instanceProps.itemOffsetMap).length) {
        var _instance$props$initS = instance.props.initScrollToIndex(),
            _index = _instance$props$initS.index,
            position = _instance$props$initS.position;

        instance.scrollToItem(_index, position);
        instance.setState({
          scrolledToInitIndex: true
        });

        if (_index === 0) {
          instance._keepScrollToBottom = true;
        } else {
          instance._keepScrollPosition = true;
        }
      }
    };

    instance._handleNewMeasurements = handleNewMeasurements; // Override the item-rendering process to wrap items with ItemMeasurer.
    // This keep the external API simpler.

    instance._renderItems = function () {
      var _instance$props2 = instance.props,
          children = _instance$props2.children,
          direction = _instance$props2.direction,
          itemCount = _instance$props2.itemCount,
          itemData = _instance$props2.itemData,
          _instance$props2$item = _instance$props2.itemKey,
          itemKey = _instance$props2$item === void 0 ? defaultItemKey : _instance$props2$item,
          skipResizeClass = _instance$props2.skipResizeClass,
          loaderId = _instance$props2.loaderId;
      var width = instance.innerRefWidth;

      var _instance$_getRangeTo2 = instance._getRangeToRender(),
          startIndex = _instance$_getRangeTo2[0],
          stopIndex = _instance$_getRangeTo2[1];

      var items = [];

      if (itemCount > 0) {
        for (var _index2 = itemCount - 1; _index2 >= 0; _index2--) {
          var _getItemMetadata = getItemMetadata(instance.props, _index2, instanceProps),
              size = _getItemMetadata.size;

          var _instance$state$local = instance.state.localOlderPostsToRender,
              localOlderPostsToRenderStartIndex = _instance$state$local[0],
              localOlderPostsToRenderStopIndex = _instance$state$local[1];
          var isItemInLocalPosts = _index2 >= localOlderPostsToRenderStartIndex && _index2 < localOlderPostsToRenderStopIndex + 1 && localOlderPostsToRenderStartIndex === stopIndex + 1;
          var isLoader = itemData[_index2] === loaderId; // It's important to read style after fetching item metadata.
          // getItemMetadata() will clear stale styles.

          var style = instance._getItemStyle(_index2);

          if (_index2 >= startIndex && _index2 < stopIndex + 1 || isItemInLocalPosts || isLoader) {
            var item = React.createElement(children, {
              data: itemData,
              itemId: itemData[_index2]
            }); // Always wrap children in a ItemMeasurer to detect changes in size.

            items.push(React.createElement(ItemMeasurer, {
              direction: direction,
              handleNewMeasurements: handleNewMeasurements,
              index: _index2,
              item: item,
              key: itemKey(_index2),
              size: size,
              itemId: itemKey(_index2),
              width: width,
              skipResizeClass: skipResizeClass,
              onUnmount: onItemRowUnmount,
              itemCount: itemCount
            }));
          } else {
            items.push(React.createElement('div', {
              key: itemKey(_index2),
              style: style
            }));
          }
        }
      }

      return items;
    };

    return instanceProps;
  },
  shouldResetStyleCacheOnItemSizeChange: false,
  validateProps: function validateProps(_ref4) {
    var itemSize = _ref4.itemSize;

    if (process.env.NODE_ENV !== 'production') {
      if (itemSize !== undefined) {
        throw Error('An unexpected "itemSize" prop has been provided.');
      }
    }
  }
});

// Animation frame based implementation of setTimeout.
// Inspired by Joe Lambert, https://gist.github.com/joelambert/1002116#file-requesttimeout-js
var hasNativePerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
var now = hasNativePerformanceNow ? function () {
  return performance.now();
} : function () {
  return Date.now();
};
function cancelTimeout(timeoutID) {
  cancelAnimationFrame(timeoutID.id);
}
function requestTimeout(callback, delay) {
  var start = now();

  function tick() {
    if (now() - start >= delay) {
      callback.call(null);
    } else {
      timeoutID.id = requestAnimationFrame(tick);
    }
  }

  var timeoutID = {
    id: requestAnimationFrame(tick)
  };
  return timeoutID;
}

var IS_SCROLLING_DEBOUNCE_INTERVAL = 150;

var defaultItemKey$1 = function defaultItemKey(_ref) {
  var columnIndex = _ref.columnIndex,
      data = _ref.data,
      rowIndex = _ref.rowIndex;
  return rowIndex + ":" + columnIndex;
};

function createGridComponent(_ref2) {
  var _class, _temp;

  var getColumnOffset = _ref2.getColumnOffset,
      getColumnStartIndexForOffset = _ref2.getColumnStartIndexForOffset,
      getColumnStopIndexForStartIndex = _ref2.getColumnStopIndexForStartIndex,
      getColumnWidth = _ref2.getColumnWidth,
      getEstimatedTotalHeight = _ref2.getEstimatedTotalHeight,
      getEstimatedTotalWidth = _ref2.getEstimatedTotalWidth,
      getOffsetForColumnAndAlignment = _ref2.getOffsetForColumnAndAlignment,
      getOffsetForRowAndAlignment = _ref2.getOffsetForRowAndAlignment,
      getRowHeight = _ref2.getRowHeight,
      getRowOffset = _ref2.getRowOffset,
      getRowStartIndexForOffset = _ref2.getRowStartIndexForOffset,
      getRowStopIndexForStartIndex = _ref2.getRowStopIndexForStartIndex,
      initInstanceProps = _ref2.initInstanceProps,
      shouldResetStyleCacheOnItemSizeChange = _ref2.shouldResetStyleCacheOnItemSizeChange,
      validateProps = _ref2.validateProps;
  return _temp = _class =
  /*#__PURE__*/
  function (_PureComponent) {
    _inheritsLoose(Grid, _PureComponent);

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    function Grid(props) {
      var _this;

      _this = _PureComponent.call(this, props) || this;
      _this._instanceProps = initInstanceProps(_this.props, _assertThisInitialized(_assertThisInitialized(_this)));
      _this._resetIsScrollingTimeoutId = null;
      _this._outerRef = void 0;
      _this.state = {
        isScrolling: false,
        horizontalScrollDirection: 'forward',
        scrollLeft: typeof _this.props.initialScrollLeft === 'number' ? _this.props.initialScrollLeft : 0,
        scrollTop: typeof _this.props.initialScrollTop === 'number' ? _this.props.initialScrollTop : 0,
        scrollUpdateWasRequested: false,
        verticalScrollDirection: 'forward'
      };
      _this._callOnItemsRendered = void 0;
      _this._callOnItemsRendered = memoizeOne(function (overscanColumnStartIndex, overscanColumnStopIndex, overscanRowStartIndex, overscanRowStopIndex, visibleColumnStartIndex, visibleColumnStopIndex, visibleRowStartIndex, visibleRowStopIndex) {
        return _this.props.onItemsRendered({
          overscanColumnStartIndex: overscanColumnStartIndex,
          overscanColumnStopIndex: overscanColumnStopIndex,
          overscanRowStartIndex: overscanRowStartIndex,
          overscanRowStopIndex: overscanRowStopIndex,
          visibleColumnStartIndex: visibleColumnStartIndex,
          visibleColumnStopIndex: visibleColumnStopIndex,
          visibleRowStartIndex: visibleRowStartIndex,
          visibleRowStopIndex: visibleRowStopIndex
        });
      });
      _this._callOnScroll = void 0;
      _this._callOnScroll = memoizeOne(function (scrollLeft, scrollTop, horizontalScrollDirection, verticalScrollDirection, scrollUpdateWasRequested) {
        return _this.props.onScroll({
          horizontalScrollDirection: horizontalScrollDirection,
          scrollLeft: scrollLeft,
          scrollTop: scrollTop,
          verticalScrollDirection: verticalScrollDirection,
          scrollUpdateWasRequested: scrollUpdateWasRequested
        });
      });
      _this._getItemStyle = void 0;

      _this._getItemStyle = function (rowIndex, columnIndex) {
        var key = rowIndex + ":" + columnIndex;

        var itemStyleCache = _this._getItemStyleCache(shouldResetStyleCacheOnItemSizeChange && _this.props.columnWidth, shouldResetStyleCacheOnItemSizeChange && _this.props.rowHeight);

        var style;

        if (itemStyleCache.hasOwnProperty(key)) {
          style = itemStyleCache[key];
        } else {
          itemStyleCache[key] = style = {
            position: 'absolute',
            left: getColumnOffset(_this.props, columnIndex, _this._instanceProps),
            top: getRowOffset(_this.props, rowIndex, _this._instanceProps),
            height: getRowHeight(_this.props, rowIndex, _this._instanceProps),
            width: getColumnWidth(_this.props, columnIndex, _this._instanceProps)
          };
        }

        return style;
      };

      _this._getItemStyleCache = void 0;
      _this._getItemStyleCache = memoizeOne(function (_, __) {
        return {};
      });

      _this._onScroll = function (event) {
        var _event$currentTarget = event.currentTarget,
            scrollLeft = _event$currentTarget.scrollLeft,
            scrollTop = _event$currentTarget.scrollTop;

        _this.setState(function (prevState) {
          if (prevState.scrollLeft === scrollLeft && prevState.scrollTop === scrollTop) {
            // Scroll position may have been updated by cDM/cDU,
            // In which case we don't need to trigger another render,
            // And we don't want to update state.isScrolling.
            return null;
          }

          return {
            isScrolling: true,
            horizontalScrollDirection: prevState.scrollLeft < scrollLeft ? 'forward' : 'backward',
            scrollLeft: scrollLeft,
            scrollTop: scrollTop,
            verticalScrollDirection: prevState.scrollTop < scrollTop ? 'forward' : 'backward',
            scrollUpdateWasRequested: false
          };
        }, _this._resetIsScrollingDebounced);
      };

      _this._outerRefSetter = function (ref) {
        var outerRef = _this.props.outerRef;
        _this._outerRef = ref;

        if (typeof outerRef === 'function') {
          outerRef(ref);
        } else if (outerRef != null && typeof outerRef === 'object' && outerRef.hasOwnProperty('current')) {
          outerRef.current = ref;
        }
      };

      _this._resetIsScrollingDebounced = function () {
        if (_this._resetIsScrollingTimeoutId !== null) {
          cancelTimeout(_this._resetIsScrollingTimeoutId);
        }

        _this._resetIsScrollingTimeoutId = requestTimeout(_this._resetIsScrolling, IS_SCROLLING_DEBOUNCE_INTERVAL);
      };

      _this._resetIsScrolling = function () {
        _this._resetIsScrollingTimeoutId = null;

        _this.setState({
          isScrolling: false
        }, function () {
          // Clear style cache after state update has been committed.
          // This way we don't break pure sCU for items that don't use isScrolling param.
          _this._getItemStyleCache(-1);
        });
      };

      return _this;
    }

    Grid.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, prevState) {
      validateSharedProps$1(nextProps);
      validateProps(nextProps);
      return null;
    };

    var _proto = Grid.prototype;

    _proto.scrollTo = function scrollTo(_ref3) {
      var scrollLeft = _ref3.scrollLeft,
          scrollTop = _ref3.scrollTop;
      this.setState(function (prevState) {
        if (scrollLeft === undefined) {
          scrollLeft = prevState.scrollLeft;
        }

        if (scrollTop === undefined) {
          scrollTop = prevState.scrollTop;
        }

        return {
          horizontalScrollDirection: prevState.scrollLeft < scrollLeft ? 'forward' : 'backward',
          scrollLeft: scrollLeft,
          scrollTop: scrollTop,
          scrollUpdateWasRequested: true,
          verticalScrollDirection: prevState.scrollTop < scrollTop ? 'forward' : 'backward'
        };
      }, this._resetIsScrollingDebounced);
    };

    _proto.scrollToItem = function scrollToItem(_ref4) {
      var _ref4$align = _ref4.align,
          align = _ref4$align === void 0 ? 'auto' : _ref4$align,
          columnIndex = _ref4.columnIndex,
          rowIndex = _ref4.rowIndex;
      var _this$state = this.state,
          scrollLeft = _this$state.scrollLeft,
          scrollTop = _this$state.scrollTop;
      this.scrollTo({
        scrollLeft: getOffsetForColumnAndAlignment(this.props, columnIndex, align, scrollLeft, this._instanceProps),
        scrollTop: getOffsetForRowAndAlignment(this.props, rowIndex, align, scrollTop, this._instanceProps)
      });
    };

    _proto.componentDidMount = function componentDidMount() {
      var _this$props = this.props,
          initialScrollLeft = _this$props.initialScrollLeft,
          initialScrollTop = _this$props.initialScrollTop;

      if (typeof initialScrollLeft === 'number' && this._outerRef != null) {
        this._outerRef.scrollLeft = initialScrollLeft;
      }

      if (typeof initialScrollTop === 'number' && this._outerRef != null) {
        this._outerRef.scrollTop = initialScrollTop;
      }

      this._callPropsCallbacks();
    };

    _proto.componentDidUpdate = function componentDidUpdate() {
      var _this$state2 = this.state,
          scrollLeft = _this$state2.scrollLeft,
          scrollTop = _this$state2.scrollTop,
          scrollUpdateWasRequested = _this$state2.scrollUpdateWasRequested;

      if (scrollUpdateWasRequested && this._outerRef !== null) {
        this._outerRef.scrollLeft = scrollLeft;
        this._outerRef.scrollTop = scrollTop;
      }

      this._callPropsCallbacks();
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      if (this._resetIsScrollingTimeoutId !== null) {
        cancelTimeout(this._resetIsScrollingTimeoutId);
      }
    };

    _proto.render = function render() {
      var _this$props2 = this.props,
          children = _this$props2.children,
          className = _this$props2.className,
          columnCount = _this$props2.columnCount,
          height = _this$props2.height,
          innerRef = _this$props2.innerRef,
          innerTagName = _this$props2.innerTagName,
          itemData = _this$props2.itemData,
          _this$props2$itemKey = _this$props2.itemKey,
          itemKey = _this$props2$itemKey === void 0 ? defaultItemKey$1 : _this$props2$itemKey,
          outerTagName = _this$props2.outerTagName,
          rowCount = _this$props2.rowCount,
          style = _this$props2.style,
          useIsScrolling = _this$props2.useIsScrolling,
          width = _this$props2.width;
      var isScrolling = this.state.isScrolling;

      var _this$_getHorizontalR = this._getHorizontalRangeToRender(),
          columnStartIndex = _this$_getHorizontalR[0],
          columnStopIndex = _this$_getHorizontalR[1];

      var _this$_getVerticalRan = this._getVerticalRangeToRender(),
          rowStartIndex = _this$_getVerticalRan[0],
          rowStopIndex = _this$_getVerticalRan[1];

      var items = [];

      if (columnCount > 0 && rowCount) {
        for (var _rowIndex = rowStartIndex; _rowIndex <= rowStopIndex; _rowIndex++) {
          for (var _columnIndex = columnStartIndex; _columnIndex <= columnStopIndex; _columnIndex++) {
            items.push(React.createElement(children, {
              columnIndex: _columnIndex,
              data: itemData,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              key: itemKey({
                columnIndex: _columnIndex,
                data: itemData,
                rowIndex: _rowIndex
              }),
              rowIndex: _rowIndex,
              style: this._getItemStyle(_rowIndex, _columnIndex)
            }));
          }
        }
      } // Read this value AFTER items have been created,
      // So their actual sizes (if variable) are taken into consideration.


      var estimatedTotalHeight = getEstimatedTotalHeight(this.props, this._instanceProps);
      var estimatedTotalWidth = getEstimatedTotalWidth(this.props, this._instanceProps);
      return React.createElement(outerTagName, {
        className: className,
        onScroll: this._onScroll,
        ref: this._outerRefSetter,
        style: _extends({
          position: 'relative',
          height: height,
          width: width,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform'
        }, style)
      }, React.createElement(innerTagName, {
        children: items,
        ref: innerRef,
        style: {
          height: estimatedTotalHeight,
          pointerEvents: isScrolling ? 'none' : '',
          width: estimatedTotalWidth
        }
      }));
    };

    _proto._callPropsCallbacks = function _callPropsCallbacks() {
      var _this$props3 = this.props,
          columnCount = _this$props3.columnCount,
          onItemsRendered = _this$props3.onItemsRendered,
          onScroll = _this$props3.onScroll,
          rowCount = _this$props3.rowCount;

      if (typeof onItemsRendered === 'function') {
        if (columnCount > 0 && rowCount > 0) {
          var _this$_getHorizontalR2 = this._getHorizontalRangeToRender(),
              _overscanColumnStartIndex = _this$_getHorizontalR2[0],
              _overscanColumnStopIndex = _this$_getHorizontalR2[1],
              _visibleColumnStartIndex = _this$_getHorizontalR2[2],
              _visibleColumnStopIndex = _this$_getHorizontalR2[3];

          var _this$_getVerticalRan2 = this._getVerticalRangeToRender(),
              _overscanRowStartIndex = _this$_getVerticalRan2[0],
              _overscanRowStopIndex = _this$_getVerticalRan2[1],
              _visibleRowStartIndex = _this$_getVerticalRan2[2],
              _visibleRowStopIndex = _this$_getVerticalRan2[3];

          this._callOnItemsRendered(_overscanColumnStartIndex, _overscanColumnStopIndex, _overscanRowStartIndex, _overscanRowStopIndex, _visibleColumnStartIndex, _visibleColumnStopIndex, _visibleRowStartIndex, _visibleRowStopIndex);
        }
      }

      if (typeof onScroll === 'function') {
        var _this$state3 = this.state,
            _horizontalScrollDirection = _this$state3.horizontalScrollDirection,
            _scrollLeft = _this$state3.scrollLeft,
            _scrollTop = _this$state3.scrollTop,
            _scrollUpdateWasRequested = _this$state3.scrollUpdateWasRequested,
            _verticalScrollDirection = _this$state3.verticalScrollDirection;

        this._callOnScroll(_scrollLeft, _scrollTop, _horizontalScrollDirection, _verticalScrollDirection, _scrollUpdateWasRequested);
      }
    } // Lazily create and cache item styles while scrolling,
    // So that pure component sCU will prevent re-renders.
    // We maintain this cache, and pass a style prop rather than index,
    // So that List can clear cached styles and force item re-render if necessary.
    ;

    _proto._getHorizontalRangeToRender = function _getHorizontalRangeToRender() {
      var _this$props4 = this.props,
          columnCount = _this$props4.columnCount,
          overscanCount = _this$props4.overscanCount,
          rowCount = _this$props4.rowCount;
      var _this$state4 = this.state,
          horizontalScrollDirection = _this$state4.horizontalScrollDirection,
          scrollLeft = _this$state4.scrollLeft;

      if (columnCount === 0 || rowCount === 0) {
        return [0, 0, 0, 0];
      }

      var startIndex = getColumnStartIndexForOffset(this.props, scrollLeft, this._instanceProps);
      var stopIndex = getColumnStopIndexForStartIndex(this.props, startIndex, scrollLeft, this._instanceProps); // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.

      var overscanBackward = horizontalScrollDirection === 'backward' ? Math.max(1, overscanCount) : 1;
      var overscanForward = horizontalScrollDirection === 'forward' ? Math.max(1, overscanCount) : 1;
      return [Math.max(0, startIndex - overscanBackward), Math.max(0, Math.min(columnCount - 1, stopIndex + overscanForward)), startIndex, stopIndex];
    };

    _proto._getVerticalRangeToRender = function _getVerticalRangeToRender() {
      var _this$props5 = this.props,
          columnCount = _this$props5.columnCount,
          rowCount = _this$props5.rowCount,
          overscanCount = _this$props5.overscanCount;
      var _this$state5 = this.state,
          verticalScrollDirection = _this$state5.verticalScrollDirection,
          scrollTop = _this$state5.scrollTop;

      if (columnCount === 0 || rowCount === 0) {
        return [0, 0, 0, 0];
      }

      var startIndex = getRowStartIndexForOffset(this.props, scrollTop, this._instanceProps);
      var stopIndex = getRowStopIndexForStartIndex(this.props, startIndex, scrollTop, this._instanceProps); // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.

      var overscanBackward = verticalScrollDirection === 'backward' ? Math.max(1, overscanCount) : 1;
      var overscanForward = verticalScrollDirection === 'forward' ? Math.max(1, overscanCount) : 1;
      return [Math.max(0, startIndex - overscanBackward), Math.max(0, Math.min(rowCount - 1, stopIndex + overscanForward)), startIndex, stopIndex];
    };

    return Grid;
  }(React.PureComponent), _class.defaultProps = {
    innerTagName: 'div',
    itemData: undefined,
    outerTagName: 'div',
    overscanCount: 1,
    useIsScrolling: false
  }, _temp;
}

var validateSharedProps$1 = function validateSharedProps(_ref5) {
  var children = _ref5.children,
      height = _ref5.height,
      width = _ref5.width;

  if (process.env.NODE_ENV !== 'production') {
    if (children == null) {
      throw Error('An invalid "children" prop has been specified. ' + 'Value should be a React component. ' + ("\"" + (children === null ? 'null' : typeof children) + "\" was specified."));
    }

    if (typeof width !== 'number') {
      throw Error('An invalid "width" prop has been specified. ' + 'Grids must specify a number for width. ' + ("\"" + (width === null ? 'null' : typeof width) + "\" was specified."));
    }

    if (typeof height !== 'number') {
      throw Error('An invalid "height" prop has been specified. ' + 'Grids must specify a number for height. ' + ("\"" + (height === null ? 'null' : typeof height) + "\" was specified."));
    }
  }
};

var FixedSizeGrid =
/*#__PURE__*/
createGridComponent({
  getColumnOffset: function getColumnOffset(_ref, index) {
    var columnWidth = _ref.columnWidth;
    return index * columnWidth;
  },
  getColumnWidth: function getColumnWidth(_ref2, index) {
    var columnWidth = _ref2.columnWidth;
    return columnWidth;
  },
  getRowOffset: function getRowOffset(_ref3, index) {
    var rowHeight = _ref3.rowHeight;
    return index * rowHeight;
  },
  getRowHeight: function getRowHeight(_ref4, index) {
    var rowHeight = _ref4.rowHeight;
    return rowHeight;
  },
  getEstimatedTotalHeight: function getEstimatedTotalHeight(_ref5) {
    var rowCount = _ref5.rowCount,
        rowHeight = _ref5.rowHeight;
    return rowHeight * rowCount;
  },
  getEstimatedTotalWidth: function getEstimatedTotalWidth(_ref6) {
    var columnCount = _ref6.columnCount,
        columnWidth = _ref6.columnWidth;
    return columnWidth * columnCount;
  },
  getOffsetForColumnAndAlignment: function getOffsetForColumnAndAlignment(_ref7, columnIndex, align, scrollLeft) {
    var columnCount = _ref7.columnCount,
        columnWidth = _ref7.columnWidth,
        width = _ref7.width;
    var maxOffset = Math.max(0, Math.min(columnCount * columnWidth - width, columnIndex * columnWidth));
    var minOffset = Math.max(0, columnIndex * columnWidth - width + columnWidth);

    switch (align) {
      case 'start':
        return maxOffset;

      case 'end':
        return minOffset;

      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);

      case 'auto':
      default:
        if (scrollLeft >= minOffset && scrollLeft <= maxOffset) {
          return scrollLeft;
        } else if (scrollLeft - minOffset < maxOffset - scrollLeft) {
          return minOffset;
        } else {
          return maxOffset;
        }

    }
  },
  getOffsetForRowAndAlignment: function getOffsetForRowAndAlignment(_ref8, rowIndex, align, scrollTop) {
    var rowHeight = _ref8.rowHeight,
        height = _ref8.height,
        rowCount = _ref8.rowCount;
    var maxOffset = Math.max(0, Math.min(rowCount * rowHeight - height, rowIndex * rowHeight));
    var minOffset = Math.max(0, rowIndex * rowHeight - height + rowHeight);

    switch (align) {
      case 'start':
        return maxOffset;

      case 'end':
        return minOffset;

      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);

      case 'auto':
      default:
        if (scrollTop >= minOffset && scrollTop <= maxOffset) {
          return scrollTop;
        } else if (scrollTop - minOffset < maxOffset - scrollTop) {
          return minOffset;
        } else {
          return maxOffset;
        }

    }
  },
  getColumnStartIndexForOffset: function getColumnStartIndexForOffset(_ref9, scrollLeft) {
    var columnWidth = _ref9.columnWidth,
        columnCount = _ref9.columnCount;
    return Math.max(0, Math.min(columnCount - 1, Math.floor(scrollLeft / columnWidth)));
  },
  getColumnStopIndexForStartIndex: function getColumnStopIndexForStartIndex(_ref10, startIndex, scrollLeft) {
    var columnWidth = _ref10.columnWidth,
        columnCount = _ref10.columnCount,
        width = _ref10.width;
    var left = startIndex * columnWidth;
    return Math.max(0, Math.min(columnCount - 1, startIndex + Math.floor((width + (scrollLeft - left)) / columnWidth)));
  },
  getRowStartIndexForOffset: function getRowStartIndexForOffset(_ref11, scrollTop) {
    var rowHeight = _ref11.rowHeight,
        rowCount = _ref11.rowCount;
    return Math.max(0, Math.min(rowCount - 1, Math.floor(scrollTop / rowHeight)));
  },
  getRowStopIndexForStartIndex: function getRowStopIndexForStartIndex(_ref12, startIndex, scrollTop) {
    var rowHeight = _ref12.rowHeight,
        rowCount = _ref12.rowCount,
        height = _ref12.height;
    var left = startIndex * rowHeight;
    return Math.max(0, Math.min(rowCount - 1, startIndex + Math.floor((height + (scrollTop - left)) / rowHeight)));
  },
  initInstanceProps: function initInstanceProps(props) {// Noop
  },
  shouldResetStyleCacheOnItemSizeChange: true,
  validateProps: function validateProps(_ref13) {
    var columnWidth = _ref13.columnWidth,
        rowHeight = _ref13.rowHeight;

    if (process.env.NODE_ENV !== 'production') {
      if (typeof columnWidth !== 'number') {
        throw Error('An invalid "columnWidth" prop has been specified. ' + 'Value should be a number. ' + ("\"" + (columnWidth === null ? 'null' : typeof columnWidth) + "\" was specified."));
      }

      if (typeof rowHeight !== 'number') {
        throw Error('An invalid "rowHeight" prop has been specified. ' + 'Value should be a number. ' + ("\"" + (rowHeight === null ? 'null' : typeof rowHeight) + "\" was specified."));
      }
    }
  }
});

var FixedSizeList =
/*#__PURE__*/
createListComponent({
  getItemOffset: function getItemOffset(_ref, index) {
    var itemSize = _ref.itemSize,
        size = _ref.size;
    return index * itemSize;
  },
  getItemSize: function getItemSize(_ref2, index) {
    var itemSize = _ref2.itemSize,
        size = _ref2.size;
    return itemSize;
  },
  getEstimatedTotalSize: function getEstimatedTotalSize(_ref3) {
    var itemCount = _ref3.itemCount,
        itemSize = _ref3.itemSize;
    return itemSize * itemCount;
  },
  getOffsetForIndexAndAlignment: function getOffsetForIndexAndAlignment(_ref4, index, align, scrollOffset) {
    var direction = _ref4.direction,
        height = _ref4.height,
        itemCount = _ref4.itemCount,
        itemSize = _ref4.itemSize,
        width = _ref4.width;
    var size = direction === 'horizontal' ? width : height;
    var maxOffset = Math.max(0, Math.min(itemCount * itemSize - size, index * itemSize));
    var minOffset = Math.max(0, index * itemSize - size + itemSize);

    switch (align) {
      case 'start':
        return maxOffset;

      case 'end':
        return minOffset;

      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);

      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }

    }
  },
  getStartIndexForOffset: function getStartIndexForOffset(_ref5, offset) {
    var itemCount = _ref5.itemCount,
        itemSize = _ref5.itemSize;
    return Math.max(0, Math.min(itemCount - 1, Math.floor(offset / itemSize)));
  },
  getStopIndexForStartIndex: function getStopIndexForStartIndex(_ref6, startIndex, scrollOffset) {
    var direction = _ref6.direction,
        height = _ref6.height,
        itemCount = _ref6.itemCount,
        itemSize = _ref6.itemSize,
        width = _ref6.width;
    var offset = startIndex * itemSize;
    var size = direction === 'horizontal' ? width : height;
    return Math.max(0, Math.min(itemCount - 1, startIndex + Math.floor((size + (scrollOffset - offset)) / itemSize)));
  },
  initInstanceProps: function initInstanceProps(props) {// Noop
  },
  shouldResetStyleCacheOnItemSizeChange: true,
  validateProps: function validateProps(_ref7) {
    var itemSize = _ref7.itemSize;

    if (process.env.NODE_ENV !== 'production') {
      if (typeof itemSize !== 'number') {
        throw Error('An invalid "itemSize" prop has been specified. ' + 'Value should be a number. ' + ("\"" + (itemSize === null ? 'null' : typeof itemSize) + "\" was specified."));
      }
    }
  }
});

var DEFAULT_ESTIMATED_ITEM_SIZE$1 = 50;

var getEstimatedTotalHeight = function getEstimatedTotalHeight(_ref, _ref2) {
  var rowCount = _ref.rowCount;
  var rowMetadataMap = _ref2.rowMetadataMap,
      estimatedRowHeight = _ref2.estimatedRowHeight,
      lastMeasuredRowIndex = _ref2.lastMeasuredRowIndex;
  var totalSizeOfMeasuredRows = 0;

  if (lastMeasuredRowIndex >= 0) {
    var itemMetadata = rowMetadataMap[lastMeasuredRowIndex];
    totalSizeOfMeasuredRows = itemMetadata.offset + itemMetadata.size;
  }

  var numUnmeasuredItems = rowCount - lastMeasuredRowIndex - 1;
  var totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedRowHeight;
  return totalSizeOfMeasuredRows + totalSizeOfUnmeasuredItems;
};

var getEstimatedTotalWidth = function getEstimatedTotalWidth(_ref3, _ref4) {
  var columnCount = _ref3.columnCount;
  var columnMetadataMap = _ref4.columnMetadataMap,
      estimatedColumnWidth = _ref4.estimatedColumnWidth,
      lastMeasuredColumnIndex = _ref4.lastMeasuredColumnIndex;
  var totalSizeOfMeasuredRows = 0;

  if (lastMeasuredColumnIndex >= 0) {
    var itemMetadata = columnMetadataMap[lastMeasuredColumnIndex];
    totalSizeOfMeasuredRows = itemMetadata.offset + itemMetadata.size;
  }

  var numUnmeasuredItems = columnCount - lastMeasuredColumnIndex - 1;
  var totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedColumnWidth;
  return totalSizeOfMeasuredRows + totalSizeOfUnmeasuredItems;
};

var getItemMetadata$1 = function getItemMetadata(itemType, props, index, instanceProps) {
  var itemMetadataMap, itemSize, lastMeasuredIndex;

  if (itemType === 'column') {
    itemMetadataMap = instanceProps.columnMetadataMap;
    itemSize = props.columnWidth;
    lastMeasuredIndex = instanceProps.lastMeasuredColumnIndex;
  } else {
    itemMetadataMap = instanceProps.rowMetadataMap;
    itemSize = props.rowHeight;
    lastMeasuredIndex = instanceProps.lastMeasuredRowIndex;
  }

  if (index > lastMeasuredIndex) {
    var offset = 0;

    if (lastMeasuredIndex >= 0) {
      var itemMetadata = itemMetadataMap[lastMeasuredIndex];
      offset = itemMetadata.offset + itemMetadata.size;
    }

    for (var i = lastMeasuredIndex + 1; i <= index; i++) {
      var size = itemSize(i);
      itemMetadataMap[i] = {
        offset: offset,
        size: size
      };
      offset += size;
    }

    if (itemType === 'column') {
      instanceProps.lastMeasuredColumnIndex = index;
    } else {
      instanceProps.lastMeasuredRowIndex = index;
    }
  }

  return itemMetadataMap[index];
};

var findNearestItem = function findNearestItem(itemType, props, instanceProps, offset) {
  var itemMetadataMap, lastMeasuredIndex;

  if (itemType === 'column') {
    itemMetadataMap = instanceProps.columnMetadataMap;
    lastMeasuredIndex = instanceProps.lastMeasuredColumnIndex;
  } else {
    itemMetadataMap = instanceProps.rowMetadataMap;
    lastMeasuredIndex = instanceProps.lastMeasuredRowIndex;
  }

  var lastMeasuredItemOffset = lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;

  if (lastMeasuredItemOffset >= offset) {
    // If we've already measured items within this range just use a binary search as it's faster.
    return findNearestItemBinarySearch$1(itemType, props, instanceProps, lastMeasuredIndex, 0, offset);
  } else {
    // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
    // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
    // The overall complexity for this approach is O(log n).
    return findNearestItemExponentialSearch(itemType, props, instanceProps, Math.max(0, lastMeasuredIndex), offset);
  }
};

var findNearestItemBinarySearch$1 = function findNearestItemBinarySearch(itemType, props, instanceProps, high, low, offset) {
  while (low <= high) {
    var middle = low + Math.floor((high - low) / 2);
    var currentOffset = getItemMetadata$1(itemType, props, middle, instanceProps).offset;

    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

var findNearestItemExponentialSearch = function findNearestItemExponentialSearch(itemType, props, instanceProps, index, offset) {
  var itemCount = itemType === 'column' ? props.columnCount : props.rowCount;
  var interval = 1;

  while (index < itemCount && getItemMetadata$1(itemType, props, index, instanceProps).offset < offset) {
    index += interval;
    interval *= 2;
  }

  return findNearestItemBinarySearch$1(itemType, props, instanceProps, Math.min(index, itemCount - 1), Math.floor(index / 2), offset);
};

var getOffsetForIndexAndAlignment = function getOffsetForIndexAndAlignment(itemType, props, index, align, scrollOffset, instanceProps) {
  var size = itemType === 'column' ? props.width : props.height;
  var itemMetadata = getItemMetadata$1(itemType, props, index, instanceProps); // Get estimated total size after ItemMetadata is computed,
  // To ensure it reflects actual measurements instead of just estimates.

  var estimatedTotalSize = itemType === 'column' ? getEstimatedTotalWidth(props, instanceProps) : getEstimatedTotalHeight(props, instanceProps);
  var maxOffset = Math.max(0, Math.min(estimatedTotalSize - size, itemMetadata.offset));
  var minOffset = Math.max(0, itemMetadata.offset - size + itemMetadata.size);

  switch (align) {
    case 'start':
      return maxOffset;

    case 'end':
      return minOffset;

    case 'center':
      return Math.round(minOffset + (maxOffset - minOffset) / 2);

    case 'auto':
    default:
      if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
        return scrollOffset;
      } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
        return minOffset;
      } else {
        return maxOffset;
      }

  }
};

var VariableSizeGrid =
/*#__PURE__*/
createGridComponent({
  getColumnOffset: function getColumnOffset(props, index, instanceProps) {
    return getItemMetadata$1('column', props, index, instanceProps).offset;
  },
  getColumnStartIndexForOffset: function getColumnStartIndexForOffset(props, scrollLeft, instanceProps) {
    return findNearestItem('column', props, instanceProps, scrollLeft);
  },
  getColumnStopIndexForStartIndex: function getColumnStopIndexForStartIndex(props, startIndex, scrollLeft, instanceProps) {
    var columnCount = props.columnCount,
        width = props.width;
    var itemMetadata = getItemMetadata$1('column', props, startIndex, instanceProps);
    var maxOffset = scrollLeft + width;
    var offset = itemMetadata.offset + itemMetadata.size;
    var stopIndex = startIndex;

    while (stopIndex < columnCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata$1('column', props, stopIndex, instanceProps).size;
    }

    return stopIndex;
  },
  getColumnWidth: function getColumnWidth(props, index, instanceProps) {
    return instanceProps.columnMetadataMap[index].size;
  },
  getEstimatedTotalHeight: getEstimatedTotalHeight,
  getEstimatedTotalWidth: getEstimatedTotalWidth,
  getOffsetForColumnAndAlignment: function getOffsetForColumnAndAlignment(props, index, align, scrollOffset, instanceProps) {
    return getOffsetForIndexAndAlignment('column', props, index, align, scrollOffset, instanceProps);
  },
  getOffsetForRowAndAlignment: function getOffsetForRowAndAlignment(props, index, align, scrollOffset, instanceProps) {
    return getOffsetForIndexAndAlignment('row', props, index, align, scrollOffset, instanceProps);
  },
  getRowOffset: function getRowOffset(props, index, instanceProps) {
    return getItemMetadata$1('row', props, index, instanceProps).offset;
  },
  getRowHeight: function getRowHeight(props, index, instanceProps) {
    return instanceProps.rowMetadataMap[index].size;
  },
  getRowStartIndexForOffset: function getRowStartIndexForOffset(props, scrollTop, instanceProps) {
    return findNearestItem('row', props, instanceProps, scrollTop);
  },
  getRowStopIndexForStartIndex: function getRowStopIndexForStartIndex(props, startIndex, scrollTop, instanceProps) {
    var rowCount = props.rowCount,
        height = props.height;
    var itemMetadata = getItemMetadata$1('row', props, startIndex, instanceProps);
    var maxOffset = scrollTop + height;
    var offset = itemMetadata.offset + itemMetadata.size;
    var stopIndex = startIndex;

    while (stopIndex < rowCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata$1('row', props, stopIndex, instanceProps).size;
    }

    return stopIndex;
  },
  initInstanceProps: function initInstanceProps(props, instance) {
    var _ref5 = props,
        estimatedColumnWidth = _ref5.estimatedColumnWidth,
        estimatedRowHeight = _ref5.estimatedRowHeight;
    var instanceProps = {
      columnMetadataMap: {},
      estimatedColumnWidth: estimatedColumnWidth || DEFAULT_ESTIMATED_ITEM_SIZE$1,
      estimatedRowHeight: estimatedRowHeight || DEFAULT_ESTIMATED_ITEM_SIZE$1,
      lastMeasuredColumnIndex: -1,
      lastMeasuredRowIndex: -1,
      rowMetadataMap: {}
    };

    instance.resetAfterColumnIndex = function (columnIndex, shouldForceUpdate) {
      if (shouldForceUpdate === void 0) {
        shouldForceUpdate = true;
      }

      instance.resetAfterIndices({
        columnIndex: columnIndex,
        shouldForceUpdate: shouldForceUpdate
      });
    };

    instance.resetAfterRowIndex = function (rowIndex, shouldForceUpdate) {
      if (shouldForceUpdate === void 0) {
        shouldForceUpdate = true;
      }

      instance.resetAfterIndices({
        rowIndex: rowIndex,
        shouldForceUpdate: shouldForceUpdate
      });
    };

    instance.resetAfterIndices = function (_ref6) {
      var columnIndex = _ref6.columnIndex,
          rowIndex = _ref6.rowIndex,
          _ref6$shouldForceUpda = _ref6.shouldForceUpdate,
          shouldForceUpdate = _ref6$shouldForceUpda === void 0 ? true : _ref6$shouldForceUpda;

      if (typeof columnIndex === 'number') {
        instanceProps.lastMeasuredColumnIndex = Math.min(instanceProps.lastMeasuredColumnIndex, columnIndex - 1);
      }

      if (typeof rowIndex === 'number') {
        instanceProps.lastMeasuredRowIndex = Math.min(instanceProps.lastMeasuredRowIndex, rowIndex - 1);
      } // We could potentially optimize further by only evicting styles after this index,
      // But since styles are only cached while scrolling is in progress-
      // It seems an unnecessary optimization.
      // It's unlikely that resetAfterIndex() will be called while a user is scrolling.


      instance._getItemStyleCache(-1);

      if (shouldForceUpdate) {
        instance.forceUpdate();
      }
    };

    return instanceProps;
  },
  shouldResetStyleCacheOnItemSizeChange: false,
  validateProps: function validateProps(_ref7) {
    var columnWidth = _ref7.columnWidth,
        rowHeight = _ref7.rowHeight;

    if (process.env.NODE_ENV !== 'production') {
      if (typeof columnWidth !== 'function') {
        throw Error('An invalid "columnWidth" prop has been specified. ' + 'Value should be a function. ' + ("\"" + (columnWidth === null ? 'null' : typeof columnWidth) + "\" was specified."));
      } else if (typeof rowHeight !== 'function') {
        throw Error('An invalid "rowHeight" prop has been specified. ' + 'Value should be a function. ' + ("\"" + (rowHeight === null ? 'null' : typeof rowHeight) + "\" was specified."));
      }
    }
  }
});

var DEFAULT_ESTIMATED_ITEM_SIZE$2 = 50;

var getItemMetadata$2 = function getItemMetadata(props, index, instanceProps) {
  var _ref = props,
      itemSize = _ref.itemSize;
  var itemMetadataMap = instanceProps.itemMetadataMap,
      lastMeasuredIndex = instanceProps.lastMeasuredIndex;

  if (index > lastMeasuredIndex) {
    var offset = 0;

    if (lastMeasuredIndex >= 0) {
      var itemMetadata = itemMetadataMap[lastMeasuredIndex];
      offset = itemMetadata.offset + itemMetadata.size;
    }

    for (var i = lastMeasuredIndex + 1; i <= index; i++) {
      var size = itemSize(i);
      itemMetadataMap[i] = {
        offset: offset,
        size: size
      };
      offset += size;
    }

    instanceProps.lastMeasuredIndex = index;
  }

  return itemMetadataMap[index];
};

var findNearestItem$1 = function findNearestItem(props, instanceProps, offset) {
  var itemMetadataMap = instanceProps.itemMetadataMap,
      lastMeasuredIndex = instanceProps.lastMeasuredIndex;
  var lastMeasuredItemOffset = lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;

  if (lastMeasuredItemOffset >= offset) {
    // If we've already measured items within this range just use a binary search as it's faster.
    return findNearestItemBinarySearch$2(props, instanceProps, lastMeasuredIndex, 0, offset);
  } else {
    // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
    // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
    // The overall complexity for this approach is O(log n).
    return findNearestItemExponentialSearch$1(props, instanceProps, Math.max(0, lastMeasuredIndex), offset);
  }
};

var findNearestItemBinarySearch$2 = function findNearestItemBinarySearch(props, instanceProps, high, low, offset) {
  while (low <= high) {
    var middle = low + Math.floor((high - low) / 2);
    var currentOffset = getItemMetadata$2(props, middle, instanceProps).offset;

    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

var findNearestItemExponentialSearch$1 = function findNearestItemExponentialSearch(props, instanceProps, index, offset) {
  var itemCount = props.itemCount;
  var interval = 1;

  while (index < itemCount && getItemMetadata$2(props, index, instanceProps).offset < offset) {
    index += interval;
    interval *= 2;
  }

  return findNearestItemBinarySearch$2(props, instanceProps, Math.min(index, itemCount - 1), Math.floor(index / 2), offset);
};

var getEstimatedTotalSize$1 = function getEstimatedTotalSize(_ref2, _ref3) {
  var itemCount = _ref2.itemCount;
  var itemMetadataMap = _ref3.itemMetadataMap,
      estimatedItemSize = _ref3.estimatedItemSize,
      lastMeasuredIndex = _ref3.lastMeasuredIndex;
  var totalSizeOfMeasuredItems = 0;

  if (lastMeasuredIndex >= 0) {
    var itemMetadata = itemMetadataMap[lastMeasuredIndex];
    totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
  }

  var numUnmeasuredItems = itemCount - lastMeasuredIndex - 1;
  var totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedItemSize;
  return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
};

var VariableSizeList =
/*#__PURE__*/
createListComponent({
  getItemOffset: function getItemOffset(props, index, instanceProps) {
    return getItemMetadata$2(props, index, instanceProps).offset;
  },
  getItemSize: function getItemSize(props, index, instanceProps) {
    return instanceProps.itemMetadataMap[index].size;
  },
  getEstimatedTotalSize: getEstimatedTotalSize$1,
  getOffsetForIndexAndAlignment: function getOffsetForIndexAndAlignment(props, index, align, scrollOffset, instanceProps) {
    var direction = props.direction,
        height = props.height,
        width = props.width;
    var size = direction === 'horizontal' ? width : height;
    var itemMetadata = getItemMetadata$2(props, index, instanceProps); // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.

    var estimatedTotalSize = getEstimatedTotalSize$1(props, instanceProps);
    var maxOffset = Math.max(0, Math.min(estimatedTotalSize - size, itemMetadata.offset));
    var minOffset = Math.max(0, itemMetadata.offset - size + itemMetadata.size);

    switch (align) {
      case 'start':
        return maxOffset;

      case 'end':
        return minOffset;

      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);

      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset - minOffset < maxOffset - scrollOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }

    }
  },
  getStartIndexForOffset: function getStartIndexForOffset(props, offset, instanceProps) {
    return findNearestItem$1(props, instanceProps, offset);
  },
  getStopIndexForStartIndex: function getStopIndexForStartIndex(props, startIndex, scrollOffset, instanceProps) {
    var direction = props.direction,
        height = props.height,
        itemCount = props.itemCount,
        width = props.width;
    var size = direction === 'horizontal' ? width : height;
    var itemMetadata = getItemMetadata$2(props, startIndex, instanceProps);
    var maxOffset = scrollOffset + size;
    var offset = itemMetadata.offset + itemMetadata.size;
    var stopIndex = startIndex;

    while (stopIndex < itemCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata$2(props, stopIndex, instanceProps).size;
    }

    return stopIndex;
  },
  initInstanceProps: function initInstanceProps(props, instance) {
    var _ref4 = props,
        estimatedItemSize = _ref4.estimatedItemSize;
    var instanceProps = {
      itemMetadataMap: {},
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE$2,
      lastMeasuredIndex: -1
    };

    instance.resetAfterIndex = function (index, shouldForceUpdate) {
      if (shouldForceUpdate === void 0) {
        shouldForceUpdate = true;
      }

      instanceProps.lastMeasuredIndex = Math.min(instanceProps.lastMeasuredIndex, index - 1); // We could potentially optimize further by only evicting styles after this index,
      // But since styles are only cached while scrolling is in progress-
      // It seems an unnecessary optimization.
      // It's unlikely that resetAfterIndex() will be called while a user is scrolling.

      instance._getItemStyleCache(-1);

      if (shouldForceUpdate) {
        instance.forceUpdate();
      }
    };

    return instanceProps;
  },
  shouldResetStyleCacheOnItemSizeChange: false,
  validateProps: function validateProps(_ref5) {
    var itemSize = _ref5.itemSize;

    if (process.env.NODE_ENV !== 'production') {
      if (typeof itemSize !== 'function') {
        throw Error('An invalid "itemSize" prop has been specified. ' + 'Value should be a function. ' + ("\"" + (itemSize === null ? 'null' : typeof itemSize) + "\" was specified."));
      }
    }
  }
});

exports.DynamicSizeList = DynamicSizeList;
exports.FixedSizeGrid = FixedSizeGrid;
exports.FixedSizeList = FixedSizeList;
exports.VariableSizeGrid = VariableSizeGrid;
exports.VariableSizeList = VariableSizeList;
