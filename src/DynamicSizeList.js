// @flow

import { createElement } from 'react';

import createListComponent, { defaultItemKey } from './createListComponent';
import ItemMeasurer from './ItemMeasurer';

import type { Props, ScrollToAlign } from './createListComponent';

const DEFAULT_ESTIMATED_ITEM_SIZE = 50;

type DynanmicProps = {|
  estimatedItemSize: number,
  ...Props<any>,
|};

export type HandleNewMeasurements = (
  key: number,
  newSize: number,
  isFirstMeasureAfterMounting: boolean
) => void;

type ItemMetadata = {|
  offset: number,
  size: number,
|};
type InstanceProps = {|
  estimatedItemSize: number,
  instance: any,
  itemOffsetMap: { [index: number]: number },
  itemSizeMap: { [index: number]: number },
  totalMeasuredSize: number,
  oldDataIds: { [index: number]: number },
|};

const getItemMetadata = (
  props: Props<any>,
  index: number,
  instanceProps: InstanceProps
): ItemMetadata => {
  const { instance, itemOffsetMap, itemSizeMap } = instanceProps;
  const { itemData } = instance.props;
  // If the specified item has not yet been measured,
  // Just return an estimated size for now.
  if (!itemSizeMap[itemData[index]]) {
    return {
      offset: 0,
      size: 0,
    };
  }

  let offset = itemOffsetMap[itemData[index]] || 0;
  let size = itemSizeMap[itemData[index]] || 0;

  return { offset, size };
};

const generateOffsetMeasurements = (props, index, instanceProps) => {
  const { instance, itemOffsetMap, itemSizeMap } = instanceProps;
  const { itemData, itemCount } = instance.props;
  instanceProps.totalMeasuredSize = 0;

  for (let i = itemCount - 1; i >= 0; i--) {
    const prevOffset = itemOffsetMap[itemData[i + 1]] || 0;

    // In some browsers (e.g. Firefox) fast scrolling may skip rows.
    // In this case, our assumptions about last measured indices may be incorrect.
    // Handle this edge case to prevent NaN values from breaking styles.
    // Slow scrolling back over these skipped rows will adjust their sizes.
    const prevSize = itemSizeMap[itemData[i + 1]] || 0;

    itemOffsetMap[itemData[i]] = prevOffset + prevSize;
    instanceProps.totalMeasuredSize += itemSizeMap[itemData[i]] || 0;
    // Reset cached style to clear stale position.
    delete instance._itemStyleCache[itemData[i]];
  }
};

const findNearestItemBinarySearch = (
  props: Props<any>,
  instanceProps: InstanceProps,
  high: number,
  low: number,
  scrollOffset: number
): number => {
  let index = low;
  while (low <= high) {
    var currentOffset = getItemMetadata(props, low, instanceProps).offset;
    if (scrollOffset - currentOffset <= 0) {
      index = low;
    }
    low++;
  }
  return index;
};

const getEstimatedTotalSize = (
  { itemCount }: Props<any>,
  { itemSizeMap, estimatedItemSize, totalMeasuredSize }: InstanceProps
) => totalMeasuredSize;

const DynamicSizeList = createListComponent({
  getItemOffset: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => getItemMetadata(props, index, instanceProps).offset,

  getItemSize: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): ?number => {
    // Do not hard-code item dimensions.
    // We don't know them initially.
    // Even once we do, changes in item content or list size should reflow.
    return getItemMetadata(props, index, instanceProps).size;
  },

  getEstimatedTotalSize,

  getOffsetForIndexAndAlignment: (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, height, width } = props;

    const size = (((direction === 'horizontal' ? width : height): any): number);
    const itemMetadata = getItemMetadata(props, index, instanceProps);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);

    const maxOffset = Math.max(
      0,
      itemMetadata.offset + itemMetadata.size - height
    );
    const minOffset = Math.max(0, itemMetadata.offset);

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

  getStartIndexForOffset: (
    props: Props<any>,
    offset: number,
    instanceProps: InstanceProps
  ): number => {
    const { totalMeasuredSize } = instanceProps;
    const { itemCount } = props;

    // If we've already positioned and measured past this point,
    // Use a binary search to find the closets cell.
    if (offset <= totalMeasuredSize) {
      return findNearestItemBinarySearch(
        props,
        instanceProps,
        itemCount,
        0,
        offset
      );
    }

    // Otherwise render a new batch of items starting from where 0.
    return 0;
  },

  getStopIndexForStartIndex: (
    props: Props<any>,
    startIndex: number,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { itemCount } = props;

    let stopIndex = startIndex;
    const maxOffset = scrollOffset + props.height;
    const itemMetadata = getItemMetadata(props, stopIndex, instanceProps);
    let offset = itemMetadata.offset + (itemMetadata.size || 0);
    let closestOffsetIndex = 0;
    while (stopIndex > 0 && offset <= maxOffset) {
      const itemMetadata = getItemMetadata(props, stopIndex, instanceProps);
      offset = itemMetadata.offset + itemMetadata.size;
      stopIndex--;
    }

    if (stopIndex >= itemCount) {
      return closestOffsetIndex;
    }

    return stopIndex;
  },

  initInstanceProps(props: Props<any>, instance: any): InstanceProps {
    const { estimatedItemSize } = ((props: any): DynanmicProps);

    const instanceProps = {
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE,
      instance,
      itemOffsetMap: {},
      itemSizeMap: {},
      totalMeasuredSize: 0,
      atBottom: true,
    };

    let mountingCorrections = 0;
    let correctedInstances = 0;
    const handleNewMeasurements: HandleNewMeasurements = (
      key: number,
      newSize: number,
      forceScrollCorrection: boolean
    ) => {
      const { itemSizeMap } = instanceProps;
      const { itemData } = instance.props;
      const index = itemData.findIndex(item => item === key);
      // In some browsers (e.g. Firefox) fast scrolling may skip rows.
      // In this case, our assumptions about last measured indices may be incorrect.
      // Handle this edge case to prevent NaN values from breaking styles.
      // Slow scrolling back over these skipped rows will adjust their sizes.
      const oldSize = itemSizeMap[key] || 0;
      if (oldSize === newSize) {
        return;
      }

      itemSizeMap[key] = newSize;

      if (!instance.state.scrolledToInitIndex) {
        generateOffsetMeasurements(props, index, instanceProps);
        return;
      }

      const element = ((instance._outerRef: any): HTMLDivElement);
      const wasAtBottom =
        instance.props.height + element.scrollTop >=
        instanceProps.totalMeasuredSize - 10;

      if (
        (wasAtBottom || instance._keepScrollToBottom) &&
        instance.props.correctScrollToBottom
      ) {
        generateOffsetMeasurements(props, index, instanceProps);
        instance.scrollToItem(0, 'end');
        instance.forceUpdate();
        return;
      }

      if (forceScrollCorrection || instance._keepScrollPosition) {
        const delta = newSize - oldSize;
        const [, , visibleStartIndex] = instance._getRangeToRender(
          instance.state.scrollOffset
        );
        generateOffsetMeasurements(props, index, instanceProps);
        if (index < visibleStartIndex + 1) {
          return;
        }

        instance._scrollCorrectionInProgress = true;

        instance.setState(
          prevState => {
            let deltaValue;
            if (mountingCorrections === 0) {
              deltaValue = delta;
            } else {
              deltaValue = prevState.scrollDelta + delta;
            }
            mountingCorrections++;
            const newOffset = prevState.scrollOffset + delta;
            return {
              scrollOffset: newOffset,
              scrollDelta: deltaValue,
            };
          },
          () => {
            // $FlowFixMe Property scrollBy is missing in HTMLDivElement
            correctedInstances++;
            if (mountingCorrections === correctedInstances) {
              correctScroll();
            }
          }
        );
        return;
      }

      generateOffsetMeasurements(props, index, instanceProps);
    };

    const correctScroll = () => {
      const { scrollOffset } = instance.state;
      const element = ((instance._outerRef: any): HTMLDivElement);
      if (element) {
        element.scrollTop = scrollOffset;
        instance._scrollCorrectionInProgress = false;
        correctedInstances = 0;
        mountingCorrections = 0;
      }
    };

    const onItemRowUnmount = (itemId, index) => {
      const { props } = instance;
      if (props.itemData[index] === itemId) {
        return;
      }
      const doesItemExist = props.itemData.includes(itemId);
      if (!doesItemExist) {
        delete instanceProps.itemSizeMap[itemId];
        delete instanceProps.itemOffsetMap[itemId];
        const element = instance._outerRef;

        var atBottom =
          element.offsetHeight + element.scrollTop >=
          instanceProps.totalMeasuredSize - 10;
        generateOffsetMeasurements(props, index, instanceProps);
        if (atBottom) {
          instance.scrollToItem(0, 'end');
        }
        instance.forceUpdate();
      }
    };

    instance._dataChange = () => {
      if (instanceProps.totalMeasuredSize < instance.props.height) {
        instance.props.canLoadMorePosts();
      }
    };

    instance._heightChange = (prevHeight, prevOffset) => {
      if (prevOffset + prevHeight >= instanceProps.totalMeasuredSize - 10) {
        instance.scrollToItem(0, 'end');
        return;
      }
    };

    instance._widthChange = (prevHeight, prevOffset) => {
      if (prevOffset + prevHeight >= instanceProps.totalMeasuredSize - 10) {
        instance.scrollToItem(0, 'end');
        return;
      }
    };

    instance._commitHook = () => {
      if (
        !instance.state.scrolledToInitIndex &&
        Object.keys(instanceProps.itemOffsetMap).length
      ) {
        const { index, position } = instance.props.initScrollToIndex();
        instance.scrollToItem(index, position);
        instance.setState({
          scrolledToInitIndex: true,
        });

        if (index === 0) {
          instance._keepScrollToBottom = true;
        } else {
          instance._keepScrollPosition = true;
        }
      }
    };

    instance._handleNewMeasurements = handleNewMeasurements;

    // Override the item-rendering process to wrap items with ItemMeasurer.
    // This keep the external API simpler.
    instance._renderItems = () => {
      const {
        children,
        direction,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
        skipResizeClass,
        loaderId,
      } = instance.props;
      const width = instance.innerRefWidth;
      let [startIndex, stopIndex] = instance._getRangeToRender();

      const items = [];
      if (itemCount > 0) {
        for (let index = itemCount - 1; index >= 0; index--) {
          const { size } = getItemMetadata(
            instance.props,
            index,
            instanceProps
          );

          const [
            localOlderPostsToRenderStartIndex,
            localOlderPostsToRenderStopIndex,
          ] = instance.state.localOlderPostsToRender;

          const isItemInLocalPosts =
            index >= localOlderPostsToRenderStartIndex &&
            index < localOlderPostsToRenderStopIndex + 1 &&
            localOlderPostsToRenderStartIndex === stopIndex + 1;

          const isLoader = itemData[index] === loaderId;

          // It's important to read style after fetching item metadata.
          // getItemMetadata() will clear stale styles.
          const style = instance._getItemStyle(index);
          if (
            (index >= startIndex && index < stopIndex + 1) ||
            isItemInLocalPosts ||
            isLoader
          ) {
            const item = createElement(children, {
              data: itemData,
              itemId: itemData[index],
            });

            // Always wrap children in a ItemMeasurer to detect changes in size.
            items.push(
              createElement(ItemMeasurer, {
                direction,
                handleNewMeasurements,
                index,
                item,
                key: itemKey(index),
                size,
                itemId: itemKey(index),
                width,
                skipResizeClass,
                onUnmount: onItemRowUnmount,
                itemCount,
              })
            );
          } else {
            items.push(
              createElement('div', {
                key: itemKey(index),
                style,
              })
            );
          }
        }
      }
      return items;
    };
    return instanceProps;
  },

  shouldResetStyleCacheOnItemSizeChange: false,

  validateProps: ({ itemSize }: Props<any>): void => {
    if (process.env.NODE_ENV !== 'production') {
      if (itemSize !== undefined) {
        throw Error('An unexpected "itemSize" prop has been provided.');
      }
    }
  },
});

export default DynamicSizeList;
