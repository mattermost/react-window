// @flow
import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';

import type { Direction } from './createListComponent';
import type { HandleNewMeasurements } from './DynamicSizeList';

class DOMRectReadOnly {
  +x: number;
  +y: number;
  +width: number;
  +height: number;
  +top: number;
  +right: number;
  +bottom: number;
  +left: number;
}

class ResizeObserverEntry {
  +target: HTMLElement;
  +contentRect: DOMRectReadOnly;
}

type Entries = $ReadOnlyArray<ResizeObserverEntry>;

type ResizeObserverCallback = {
  // eslint-disable-next-line no-use-before-define
  (entries: Entries, observer: ResizeObserver): void,
};

declare class ResizeObserver {
  constructor(ResizeObserverCallback): ResizeObserver;
  observe(target: HTMLElement): void;
  unobserve(target: HTMLElement): void;
  disconnect(): void;
}

type ItemMeasurerProps = {|
  direction: Direction,
  handleNewMeasurements: HandleNewMeasurements,
  skipResizeClass: string,
  index: number,
  item: React$Element<any>,
  size: number,
  width: number,
|};

const scrollBarWidth = 8;
const scrollableContainerStyles = {
  display: 'inline',
  width: '0px',
  height: '0px',
  zIndex: '-1',
  overflow: 'hidden',
  margin: '0px',
  padding: '0px',
};

const scrollableWrapperStyle = {
  position: 'absolute',
  flex: '0 0 auto',
  overflow: 'hidden',
  visibility: 'hidden',
  zIndex: '-1',
  width: '100%',
  height: '100%',
  left: '0px',
  top: '0px',
};

const expandShrinkContainerStyles = {
  flex: '0 0 auto',
  overflow: 'hidden',
  zIndex: '-1',
  visibility: 'hidden',
  left: `-${scrollBarWidth + 1}px`, //8px(scrollbar width) + 1px
  bottom: `-${scrollBarWidth}px`, //8px because of scrollbar width
  right: `-${scrollBarWidth}px`, //8px because of scrollbar width
  top: `-${scrollBarWidth + 1}px`, //8px(scrollbar width) + 1px
};

const expandShrinkStyles = {
  position: 'absolute',
  flex: '0 0 auto',
  visibility: 'hidden',
  overflow: 'scroll',
  zIndex: '-1',
  width: '100%',
  height: '100%',
};

const shrinkChildStyle = {
  position: 'absolute',
  height: '200%',
  width: '200%',
};

//values below need to be changed when scrollbar width changes
//TODO: change these to be dynamic

const shrinkScrollDelta = 2 * scrollBarWidth + 1; // 17 = 2* scrollbar width(8px) + 1px as buffer

// 27 = 2* scrollbar width(8px) + 1px as buffer + 10px(this value is based of off lib(Link below). Probably not needed but doesnt hurt to leave)
//https://github.com/wnr/element-resize-detector/blob/27983e59dce9d8f1296d8f555dc2340840fb0804/src/detection-strategy/scroll.js#L246
const expandScrollDelta = shrinkScrollDelta + 10;

export default class ItemMeasurer extends Component<ItemMeasurerProps, void> {
  _node: HTMLElement | null = null;
  _resizeObserver: ResizeObserver | null = null;
  _resizeSensorExpand = React.createRef();
  _resizeSensorShrink = React.createRef();
  _positionScrollbarsRef = null;

  componentDidMount() {
    const node = ((findDOMNode(this): any): HTMLElement);
    this._node = node;
    // Force sync measure for the initial mount.
    // This is necessary to support the DynamicSizeList layout logic.
    this._measureItem(false);

    if (this.props.size) {
      // Don't wait for positioning scrollbars when we have size
      // This is needed triggering an event for remounting a post
      this.positionScrollBars();
    }
  }

  shouldComponentUpdate(nextProps) {
    if (
      nextProps.width !== this.props.width ||
      nextProps.size !== this.props.size ||
      nextProps.itemCount !== this.props.itemCount
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(prevProps) {
    if (
      (prevProps.size === 0 && this.props.size !== 0) ||
      prevProps.size !== this.props.size
    ) {
      this.positionScrollBars();
    }
  }

  positionScrollBars = (height = this.props.size, width = this.props.width) => {
    //we are position these hiiden div scroll bars to the end so they can emit
    //scroll event when height in the div changes
    //Heavily inspired from https://github.com/marcj/css-element-queries/blob/master/src/ResizeSensor.js
    //and https://github.com/wnr/element-resize-detector/blob/master/src/detection-strategy/scroll.js
    //For more info http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/#comment-244
    if (this._positionScrollbarsRef) {
      window.cancelAnimationFrame(this._positionScrollbarsRef);
    }
    this._positionScrollbarsRef = window.requestAnimationFrame(() => {
      this._resizeSensorExpand.current.scrollTop = height + expandScrollDelta;
      this._resizeSensorShrink.current.scrollTop =
        2 * height + shrinkScrollDelta;
    });
  };

  componentWillUnmount() {
    if (this._positionScrollbarsRef) {
      window.cancelAnimationFrame(this._positionScrollbarsRef);
    }

    const { onUnmount, itemId, index } = this.props;
    if (onUnmount) {
      onUnmount(itemId, index);
    }
  }

  scrollingDiv = event => {
    if (event.target.offsetHeight !== this.props.size) {
      this._measureItem(event.target.offsetWidth !== this.props.width);
    }
  };

  renderItems = () => {
    const item = this.props.item;

    const expandChildStyle = {
      position: 'absolute',
      left: '0',
      top: '0',
      height: `${this.props.size + expandScrollDelta}px`,
      width: '100%',
    };

    const renderItem = (
      <div style={{ position: 'relative' }}>
        {item}
        <div style={scrollableContainerStyles}>
          <div dir="ltr" style={scrollableWrapperStyle}>
            <div style={expandShrinkContainerStyles}>
              <div
                style={expandShrinkStyles}
                ref={this._resizeSensorExpand}
                onScroll={this.scrollingDiv}
              >
                <div style={expandChildStyle} />
              </div>
              <div
                style={expandShrinkStyles}
                ref={this._resizeSensorShrink}
                onScroll={this.scrollingDiv}
              >
                <div style={shrinkChildStyle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    return renderItem;
  };

  render() {
    return this.renderItems();
  }

  _measureItem = (forceScrollCorrection: boolean) => {
    const {
      direction,
      handleNewMeasurements,
      size: oldSize,
      itemId,
    } = this.props;

    const node = this._node;

    if (
      node &&
      node.ownerDocument &&
      node.ownerDocument.defaultView &&
      node instanceof node.ownerDocument.defaultView.HTMLElement
    ) {
      const newSize =
        direction === 'horizontal'
          ? Math.ceil(node.offsetWidth)
          : Math.ceil(node.offsetHeight);

      if (oldSize !== newSize) {
        handleNewMeasurements(itemId, newSize, forceScrollCorrection);
      }
    }
  };
}
